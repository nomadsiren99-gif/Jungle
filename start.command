#!/bin/bash
cd "/Users/dibesu/Downloads/Jungle" || cd "$(dirname "$0")"
echo "=================================================="
echo " Starting Jungle. Website & CMS Server..."
echo "=================================================="
open "http://localhost:3000" 2>/dev/null || true
open "http://localhost:3000/admin" 2>/dev/null || true
npm start
