#!/bin/bash
# Script to resolve package manager conflicts and install Python dev dependencies on Lubuntu

echo "============================================="
echo "   REPAIRING LUBUNTU PACKAGE MANAGER         "
echo "============================================="

echo "1. Configuring any unconfigured packages..."
sudo dpkg --configure -a

echo "2. Repairing broken dependencies..."
sudo apt-get install -f -y

echo "3. Cleaning package cache..."
sudo apt-get clean
sudo apt-get autoremove -y

echo "4. Updating package index files..."
sudo apt-get update --fix-missing

echo "5. Installing Python development headers and venv..."
sudo apt-get install -y python3-dev python3.12-dev python3-venv python3.12-venv

echo "============================================="
echo "   VERIFYING DEPENDENCIES                    "
echo "============================================="
if dpkg -s python3-dev &>/dev/null; then
    echo "SUCCESS: python3-dev is now fully installed!"
    echo "Python.h is located at: $(find /usr/include -name 'Python.h' | head -n 1)"
else
    echo "ERROR: python3-dev installation failed. Please check error logs above."
fi
