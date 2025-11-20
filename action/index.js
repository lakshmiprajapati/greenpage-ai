const core = require('@actions/core');
const axios = require('axios');

// Simulation: If running locally, use these defaults. 
// On real GitHub, these come from the YAML file.
const INPUT_URL = core.getInput('url') || 'https://google.com'; 
const INPUT_BUDGET = core.getInput('max_budget') || '0.5'; 

const BACKEND_URL = 'http://localhost:3001/api/scan'; // In production, this would be your deployed API URL

async function run() {
  try {
    console.log(`🌲 GreenPage Audit Starting...`);
    console.log(`🎯 Target: ${INPUT_URL}`);
    console.log(`💰 Carbon Budget: ${INPUT_BUDGET}g CO2`);

    // 1. Request a Scan
    console.log('🚀 Requesting scan from Core API...');
    const startRes = await axios.post(BACKEND_URL, { url: INPUT_URL });
    const { scanId } = startRes.data;
    console.log(`✅ Scan started (ID: ${scanId})`);

    // 2. Poll for Results (Wait until it's done)
    let status = 'PENDING';
    let finalResult = null;

    while (status === 'PENDING') {
      // Wait 2 seconds
      await new Promise(r => setTimeout(r, 2000));
      
      // Check status
      const checkRes = await axios.get(`${BACKEND_URL}/${scanId}`);
      status = checkRes.data.status;
      
      if (status === 'COMPLETED') {
        finalResult = checkRes.data;
      } else if (status === 'FAILED') {
        throw new Error('The audit failed on the server side.');
      }
    }

    // 3. Check against Budget
    const score = finalResult.carbonScore;
    console.log(`\n📊 FINAL RESULT: ${score.toFixed(4)}g CO2`);

    if (score > parseFloat(INPUT_BUDGET)) {
      // THIS is the magic. This command tells GitHub to BLOCK the merge.
      core.setFailed(`❌ BUDGET EXCEEDED! Your page (${score.toFixed(4)}g) is dirtier than the limit (${INPUT_BUDGET}g).`);
    } else {
      console.log(`✅ PASSED! Your page is within the carbon budget.`);
    }

  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();