#!/bin/bash

for ((i=1; i<=5; i++)); do
    python ppt2pdf.py "Module $i.pptx" "Module $i.pdf"
done