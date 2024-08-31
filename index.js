const { Connection, PublicKey, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const fs = require("fs");
const exec = require("child_process").exec;

// Solana 主网连接
const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=5380ee8b-50f2-47f6-b400-c1a888346df7", "confirmed");

// 监控的钱包地址及其对应的执行脚本路径
const walletsToMonitor = {
    "2efeLemAKwpnWjs3vdkAcYTaH6RVmXLeULtNp4JScHjR": "/root/ore-hq-server/server1/restart1.sh",
    "2CmzZ7yq2JqY8aeaNiPidbVVrbcbwT2Aj8a7q45scNdL": "/root/ore-hq-server/server2/restart2.sh",
    // 添加更多的地址和脚本
};

// 检查Solana钱包的余额和最后交易时间
async function checkBalanceAndLastTx(walletAddress, scriptPath) {
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
        console.log(JSON.stringify(signatures), "===")

        const lastTxTime = signatures.length > 0 ? new Date(signatures[0].blockTime*1000) : null;

        console.log(`Balance: ${balanceInSol} SOL, Last Transaction Time: ${lastTxTime ? lastTxTime.toISOString() : 'No transactions found'} for address ${walletAddress}`);

        if (balanceInSol < 0.001 || (!lastTxTime || lastTxTime.getTime() < fiveMinutesAgo)) {
            console.log(`Balance is less than 0.01 SOL or last transaction was more than 5 minutes ago for address ${walletAddress}.`);
            executeScript(scriptPath);
        } else {
            console.log(`Balance: ${balanceInSol} SOL, Last Transaction Time: ${lastTxTime ? lastTxTime.toISOString() : 'No transactions found'} for address ${walletAddress}`);
        }
    } catch (error) {
        console.error(`Error checking Solana wallet (${walletAddress}): ${error.message}`);
    }
}

// 执行特定脚本
function executeScript(scriptPath) {
    console.log(`Executing script at ${scriptPath}`);
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
        const scriptPath = walletsToMonitor[address];
        await checkBalanceAndLastTx(address, scriptPath);
    });
}, 5 * 60 * 1000);

// 立即执行一次
Object.keys(walletsToMonitor).forEach(async (address) => {
    const scriptPath = walletsToMonitor[address];
    await checkBalanceAndLastTx(address, scriptPath);
});
