#!/bin/bash

export OPENAI_API_KEY=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
export VITE_OPENAI_API_KEY=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

echo "🚀 Starting server with correct OpenAI key..."
echo "🔑 OpenAI key ends with: ...$(echo $OPENAI_API_KEY | tail -c 10)"

node server-mysql.js 