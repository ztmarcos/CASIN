#!/bin/bash
echo "Checking Firebase Functions logs..."
echo "=================================="
echo ""
echo "Recent sendEmail function logs:"
firebase functions:log --only sendEmail 2>&1 | head -100 || echo "Firebase CLI not available or not logged in"
echo ""
echo "=================================="
