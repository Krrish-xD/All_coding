#!/bin/bash

while true; do
    # Try to get nvidia utilization
    util=$(nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits 2>/dev/null)
    
    if [ -z "$util" ]; then
        util="0"
    fi
    
    echo "{\"text\": \"󰢮 ${util}%\"}"
    sleep 2
done
