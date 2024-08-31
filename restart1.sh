#!/bin/bash

# 检查进程是否存在
if pgrep -xf "/root/ore-hq-server/target/release/ore-hq-server --priority-fee 1000 --miner-ids 1,1" > /dev/null
then
    # 获取进程ID
    pid=$(pgrep -xf "/root/ore-hq-server/target/release/ore-hq-server --priority-fee 1000 --miner-ids 1,1")
    # 终止进程
    kill $pid
    echo "Stopped server1 with PID: $pid"    
fi
nohup /root/ore-hq-server/target/release/ore-hq-server --priority-fee 1000 --miner-ids 1,1 2>&1 &
echo "server1 Started!"
