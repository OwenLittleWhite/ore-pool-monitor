const { Connection, PublicKey, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");
const exec = require("child_process").exec;
const addressConfig = require("./config.json")

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
        const lastTxTime = signatures.length > 0 ? new Date(signatures[0].blockTime * 1000) : null;

        console.log(`Balance: ${balanceInSol} SOL, Last Transaction Time: ${lastTxTime ? lastTxTime.toISOString() : 'No transactions found'} for address ${walletAddress}`);

        if (balanceInSol < 0.001 || (!lastTxTime || lastTxTime.getTime() < fiveMinutesAgo)) {
            console.log(`Balance is less than 0.01 SOL or last transaction was more than 5 minutes ago for address ${walletAddress}.`);
            executeScript(scriptPath, directory);
        } else {
            console.log(`Balance: ${balanceInSol} SOL, Last Transaction Time: ${lastTxTime ? lastTxTime.toISOString() : 'No transactions found'} for address ${walletAddress}`);
        }
    } catch (error) {
        console.error(`Error checking Solana wallet (${walletAddress}): ${error.message}`);
    }
}

// 执行特定脚本
function executeScript(scriptPath, directory) {
    console.log(`Executing script at ${path.join(directory, scriptPath)}`);

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
        console.log(`Script executed successfully (${scriptPath}): ${stdout}`);
    });
}


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
