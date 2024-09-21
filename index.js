const { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair, Transaction, SystemProgram } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");
const exec = require("child_process").exec;
const addressConfig = require("./config.json")
function log(...args) {
    console.log(new Date(), ...args);
}

// Solana 主网连接
const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=5380ee8b-50f2-47f6-b400-c1a888346df7", "confirmed");

// 监控的钱包地址及其对应的执行脚本路径
const walletsToMonitor = addressConfig

// 检查Solana钱包的余额和最后交易时间
async function checkBalanceAndLastTx(walletAddress, scriptPath, directory) {
    try {
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000); // 五分钟后的时间戳

        // 获取Solana钱包余额
        const balance = await connection.getBalance(new PublicKey(walletAddress));
        const balanceInSol = balance / LAMPORTS_PER_SOL; // 转成SOL

        // 获取Solana钱包最后交易时间
        let signatures = await connection.getSignaturesForAddress(new PublicKey(walletAddress), {
            before: null,
            until: null,
            commitment: "confirmed",
            limit: 1
        });
        if (signatures.length === 0) {
            log(`No transactions found for address ${walletAddress}.`);
            executeScript(scriptPath, directory);
            return
        }
        const lastTxTime = signatures.length > 0 ? new Date(signatures[0].blockTime * 1000) : null;

        log(`Balance: ${balanceInSol} SOL, Last Transaction Time: ${lastTxTime ? lastTxTime.toISOString() : 'No transactions found'} for address ${walletAddress}`);

        if (balanceInSol < 0.001 || (!lastTxTime || lastTxTime.getTime() < fiveMinutesAgo)) {
            log(`Balance is less than 0.01 SOL or last transaction was more than 5 minutes ago for address ${walletAddress}.`);
            executeScript(scriptPath, directory);
        } else {
            log(`Balance: ${balanceInSol} SOL, Last Transaction Time: ${lastTxTime ? lastTxTime.toISOString() : 'No transactions found'} for address ${walletAddress}`);
        }
    } catch (error) {
        console.error(new Date(), `Error checking Solana wallet (${walletAddress}): ${error.message}`);
    }
}

// 执行特定脚本
function executeScript(scriptPath, directory) {
    log(`Executing script at ${path.join(directory, scriptPath)}`);

    // 切换工作目录
    process.chdir(directory);

    exec(`sh ${scriptPath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing script (${scriptPath}): ${error}`);
            return;
        }
        if (stderr) {
            console.error(`Script execution error (${scriptPath}): ${stderr}`);
            return;
        }
        log(`Script executed successfully (${scriptPath}): ${stdout}`);
    });
}

async function sendSol(sendKeyFile, recipient) {
    const privateKeyJson = JSON.parse(fs.readFileSync(sendKeyFile, 'utf8'));
    const payerKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyJson));
    const amount = 0.05 * LAMPORTS_PER_SOL;
    const recipientPublicKey = new PublicKey(recipient);
    try {
        // 获取当前账户余额
        const payerBalanceBefore = await connection.getBalance(payerKeypair.publicKey);
        log(`Payer balance before transfer: ${payerBalanceBefore / LAMPORTS_PER_SOL} SOL`);

        // 构建交易
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: payerKeypair.publicKey,
                toPubkey: recipientPublicKey,
                lamports: amount,
            })
        );

        // 发送交易
        const signature = await connection.sendTransaction(transaction, [payerKeypair]);

        // 确认交易成功
        const confirmation = await connection.confirmTransaction(signature, 'finalized');
        log(`Transaction confirmed: ${JSON.stringify(confirmation)}`);

        // 获取当前账户余额
        const payerBalanceAfter = await connection.getBalance(payerKeypair.publicKey);
        log(`Payer balance after transfer: ${payerBalanceAfter / LAMPORTS_PER_SOL} SOL`);

        log(`Transaction successful: https://explorer.solana.com/tx/${signature}?cluster=mainnet-beta`);

    } catch (error) {
        console.error(`Transaction failed: ${error}`);
    }
}

// sendSol('pay1.json', '3qevjWzjpHEmqApxufKrwCxU9qbaio3HRuGdhWXG5sdY')

// 设置定时器每五分钟执行一次
setInterval(() => {
    Object.keys(walletsToMonitor).forEach(async (address) => {
        const { scriptPath, directory } = walletsToMonitor[address];
        await checkBalanceAndLastTx(address, scriptPath, directory);
    });
}, 5 * 60 * 1000);

// 立即执行一次
Object.keys(walletsToMonitor).forEach(async (address) => {
    const { scriptPath, directory } = walletsToMonitor[address];
    await checkBalanceAndLastTx(address, scriptPath, directory);
});
