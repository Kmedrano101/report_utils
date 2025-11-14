#!/usr/bin/env node
/**
 * Test Script for Ollama Models
 * Tests both Llama 3.1 8B and Qwen2.5-Coder 7B models
 */

const OLLAMA_URL = 'http://localhost:11434';

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    red: '\x1b[31m'
};

/**
 * Test a model with a prompt
 */
async function testModel(modelName, prompt, description) {
    console.log(`\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bright}Testing: ${modelName}${colors.reset}`);
    console.log(`${colors.cyan}Task: ${description}${colors.reset}`);
    console.log(`${colors.yellow}Prompt: "${prompt}"${colors.reset}`);
    console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

    const startTime = Date.now();

    try {
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelName,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.1,
                    top_p: 0.9,
                    num_predict: 200
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`\n${colors.green}✓ Response (${duration}s):${colors.reset}`);
        console.log(`${colors.bright}${data.response.trim()}${colors.reset}\n`);

        // Show stats
        if (data.total_duration) {
            const totalSec = (data.total_duration / 1000000000).toFixed(2);
            const promptSec = data.prompt_eval_duration ? (data.prompt_eval_duration / 1000000000).toFixed(2) : 'N/A';
            const evalSec = data.eval_duration ? (data.eval_duration / 1000000000).toFixed(2) : 'N/A';
            const tokensPerSec = data.eval_count && data.eval_duration
                ? (data.eval_count / (data.eval_duration / 1000000000)).toFixed(2)
                : 'N/A';

            console.log(`${colors.cyan}Stats:${colors.reset}`);
            console.log(`  Total time: ${totalSec}s`);
            console.log(`  Prompt eval: ${promptSec}s`);
            console.log(`  Generation: ${evalSec}s`);
            console.log(`  Tokens generated: ${data.eval_count || 'N/A'}`);
            console.log(`  Speed: ${tokensPerSec} tokens/sec`);
        }

        return { success: true, duration, response: data.response };

    } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n${colors.red}✗ Error (${duration}s): ${error.message}${colors.reset}\n`);
        return { success: false, duration, error: error.message };
    }
}

/**
 * Test SQL generation (Qwen2.5-Coder specialty)
 */
async function testSQLGeneration() {
    const prompt = `Generate a SQL query to get the average temperature by location from a table called sensor_readings with columns: timestamp, sensor_id, location, temperature. Only output the SQL query, no explanation.`;

    return await testModel(
        'qwen2.5-coder:7b',
        prompt,
        'SQL Query Generation'
    );
}

/**
 * Test MetricsQL generation (Qwen2.5-Coder specialty)
 */
async function testMetricsQLGeneration() {
    const prompt = `Generate a MetricsQL query to get the sum of all clamp_current_amperes metrics grouped by sensor_code. Only output the query, no explanation.`;

    return await testModel(
        'qwen2.5-coder:7b',
        prompt,
        'MetricsQL Query Generation'
    );
}

/**
 * Test code generation (Qwen2.5-Coder specialty)
 */
async function testCodeGeneration() {
    const prompt = `Write a JavaScript function that checks if a number is prime. Only output the code, no explanation.`;

    return await testModel(
        'qwen2.5-coder:7b',
        prompt,
        'JavaScript Code Generation'
    );
}

/**
 * Test general question (Llama 3.1 specialty)
 */
async function testGeneralQuestion() {
    const prompt = `Explain what VictoriaMetrics is in one sentence.`;

    return await testModel(
        'llama3.1:8b',
        prompt,
        'General Knowledge Question'
    );
}

/**
 * Test text analysis (Llama 3.1 specialty)
 */
async function testTextAnalysis() {
    const prompt = `Summarize the key benefits of using a time-series database for IoT sensor data in 2-3 sentences.`;

    return await testModel(
        'llama3.1:8b',
        prompt,
        'Text Analysis & Summary'
    );
}

/**
 * Check Ollama availability
 */
async function checkOllama() {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/tags`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        return data.models;
    } catch (error) {
        console.error(`${colors.red}✗ Cannot connect to Ollama at ${OLLAMA_URL}${colors.reset}`);
        console.error(`  Error: ${error.message}`);
        console.error(`\n  Make sure Ollama is running: ollama serve`);
        return null;
    }
}

/**
 * Main test suite
 */
async function runTests() {
    console.log(`${colors.bright}${colors.green}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.green}║          Ollama Models Test Suite                     ║${colors.reset}`);
    console.log(`${colors.bright}${colors.green}╚═══════════════════════════════════════════════════════╝${colors.reset}`);

    // Check Ollama availability
    console.log(`\n${colors.cyan}Checking Ollama availability...${colors.reset}`);
    const models = await checkOllama();

    if (!models) {
        process.exit(1);
    }

    console.log(`${colors.green}✓ Ollama is running${colors.reset}`);
    console.log(`\n${colors.bright}Available models:${colors.reset}`);
    models.forEach(model => {
        const sizeMB = (model.size / (1024 * 1024)).toFixed(0);
        console.log(`  • ${colors.bright}${model.name}${colors.reset} - ${sizeMB}MB - ${model.details.parameter_size || 'N/A'}`);
    });

    const results = [];

    // Test Qwen2.5-Coder (Code & Query Specialist)
    console.log(`\n${colors.bright}${colors.blue}═══ Testing Qwen2.5-Coder 7B (Code Specialist) ═══${colors.reset}`);
    results.push(await testSQLGeneration());
    results.push(await testMetricsQLGeneration());
    results.push(await testCodeGeneration());

    // Test Llama 3.1 (General Purpose)
    console.log(`\n${colors.bright}${colors.blue}═══ Testing Llama 3.1 8B (General Purpose) ═══${colors.reset}`);
    results.push(await testGeneralQuestion());
    results.push(await testTextAnalysis());

    // Summary
    console.log(`\n${colors.bright}${colors.green}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.green}║                  Test Summary                         ║${colors.reset}`);
    console.log(`${colors.bright}${colors.green}╚═══════════════════════════════════════════════════════╝${colors.reset}`);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const avgDuration = (results.reduce((sum, r) => sum + parseFloat(r.duration), 0) / results.length).toFixed(2);

    console.log(`\n${colors.bright}Results:${colors.reset}`);
    console.log(`  ${colors.green}✓ Successful: ${successful}${colors.reset}`);
    console.log(`  ${colors.red}✗ Failed: ${failed}${colors.reset}`);
    console.log(`  ${colors.cyan}Average duration: ${avgDuration}s${colors.reset}`);

    console.log(`\n${colors.bright}${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.green}✓ All tests completed!${colors.reset}`);
    console.log(`${colors.bright}${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

// Run tests
runTests().catch(console.error);
