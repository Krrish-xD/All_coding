#!/bin/bash

format_speed() {
    local bytes=$1
    if [ $bytes -ge 1048576 ]; then
        echo "$((bytes / 1048576))m"
    elif [ $bytes -ge 1024 ]; then
        echo "$((bytes / 1024))k"
    else
        echo "$bytes"
    fi
}

iface=$(ip route | grep default | awk '{print $5}' | head -n1)
if [ -n "$iface" ] && [ -e "/sys/class/net/$iface/statistics/rx_bytes" ]; then
    rx1=$(cat /sys/class/net/$iface/statistics/rx_bytes)
    tx1=$(cat /sys/class/net/$iface/statistics/tx_bytes)
else
    rx1=0
    tx1=0
fi

while true; do
    sleep 1
    iface=$(ip route | grep default | awk '{print $5}' | head -n1)
    if [ -z "$iface" ] || [ ! -e "/sys/class/net/$iface/statistics/rx_bytes" ]; then
        echo "{\"text\": \"Offline\", \"class\": \"disconnected\"}"
        continue
    fi
    
    rx2=$(cat /sys/class/net/$iface/statistics/rx_bytes)
    tx2=$(cat /sys/class/net/$iface/statistics/tx_bytes)

    rx_rate=$((rx2 - rx1))
    tx_rate=$((tx2 - tx1))
    rx1=$rx2
    tx1=$tx2

    down=$(format_speed $rx_rate)
    up=$(format_speed $tx_rate)

    echo "{\"text\": \"↓$down ↑$up\", \"class\": \"connected\"}"
done
