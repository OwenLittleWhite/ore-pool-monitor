#!/bin/bash

# 检查进程是否存在
if pgrep -xf "/root/ore-hq-server/target/release/ore-hq-server --priority-fee 1000 --miner-ids 2,2 --port 3001" > /dev/null
then
    # 获取进程ID
    pid=$(pgrep -xf "/root/ore-hq-server/target/release/ore-hq-server --priority-fee 1000 --miner-ids 2,2 --port 3001")
    # 终止进程
    kill $pid
    echo "Stopped server2 with PID: $pid"    
fi
nohup /root/ore-hq-server/target/release/ore-hq-server --priority-fee 1000 --miner-ids 2,2 --port 3001 2>&1 &
echo "server2 Started!"
