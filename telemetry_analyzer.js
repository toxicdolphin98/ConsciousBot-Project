const fs = require('fs');
const path = require('path');

// Target paths based on your core bot architecture settings
const BOT_USERNAME = 'ConsciousBot';

// FIX: Hardened directory fallback path checks to survive inside project subfolders
const PROJECT_ROOT = fs.existsSync(path.join(__dirname, `memory_${BOT_USERNAME}.json`)) 
  ? __dirname 
  : path.join(__dirname, '..');

const MEMORY_FILE = path.join(PROJECT_ROOT, `memory_${BOT_USERNAME}.json`);
const SKILLS_DIR = path.join(PROJECT_ROOT, 'skills');

function printDivider() {
  console.log('================================================================================');
}

function runTelemetryAnalysis() {
  console.clear();
  printDivider();
  console.log(`🤖 CONSCIOUS_BOT AGENT TELEMETRY LIVE MONITOR MATRIX [${new Date().toLocaleTimeString()}]`);
  printDivider();

  // 1. Process Core Brain Parameters
  if (!fs.existsSync(MEMORY_FILE)) {
    console.log(`⚠️ Telemetry data offline. Waiting for [${BOT_USERNAME}] to write database file...`);
    console.log(`   Checked Path: ${MEMORY_FILE}`);
    return;
  }

  try {
    const memoryData = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    const score = memoryData.rewardScore || 0;
    const isComplete = memoryData.isTrainingComplete || false;
    const targetObjective = memoryData.longTermObjective || "Not established.";

    // Calculate progression percentage toward the milestone governor
    const targetGoal = 1000;
    const progressPercent = Math.min(100, Math.floor((score / targetGoal) * 100));
    
    // Build a clean scannable horizontal terminal bar block
    const barWidth = 30;
    const filledWidth = Math.floor((progressPercent / 100) * barWidth);
    const progressBar = '█'.repeat(filledWidth) + '░'.repeat(barWidth - filledWidth);

    console.log(`[🧠 BRAIN CORE STATUS]`);
    console.log(`• Active Objective  : ${targetObjective}`);
    console.log(`• Training Score    : [${score} / ${targetGoal} pts]`);
    console.log(`• Status Profile    : ${isComplete ? '🎯 COMPLETE (Logs Frozen)' : '⚡ ACTIVE TRAINING STATE'}`);
    console.log(`• Progress Vector   : [${progressBar}] ${progressPercent}%`);
    console.log('');

    // 2. Count Verified Skills inside voxel folder cache
    console.log(`[🛠️ CONFIRMED SKILLS CATALOG]`);
    if (fs.existsSync(SKILLS_DIR)) {
      const skillFiles = fs.readdirSync(SKILLS_DIR).filter(file => file.endsWith('.json'));
      console.log(`• Total Skills Mastered: ${skillFiles.length} blocks verified.`);
      if (skillFiles.length > 0) {
        const sampleSkills = skillFiles.slice(-4).map(s => s.replace('.json', '').replace('mine_', ''));
        console.log(`• Recent Skills Mapped : [${sampleSkills.join(', ')}]`);
      }
    } else {
      console.log(`• Total Skills Mastered: 0 files created.`);
    }
    console.log('');

    // 3. Extract and filter cognitive history layers
    console.log(`[📜 COGNITIVE LOG MATRIX (Last 5 Slices)]`);
    if (memoryData.experiences && memoryData.experiences.length > 0) {
      const cleanLogs = memoryData.experiences.slice(-5);
      cleanLogs.forEach((log, index) => {
        // Strip down system headers for pure readability maps
        const readableLog = log.replace('System:', '⚙️').replace('Chat exchange with', '💬 From');
        console.log(`  [${index + 1}] ${readableLog}`);
      });
    } else {
      console.log("  No interaction logs cached inside the history layer yet.");
    }

  } catch (err) {
    console.log(`❌ Telemetry sync failure during execution: ${err.message}`);
  }

  printDivider();
  console.log("💡 The display is locked. Press Ctrl+C at any moment to stop live tracking.");
}

// OPTION: Runs instantly, then loops every 4000ms to provide a live monitoring dashboard view
runTelemetryAnalysis();
setInterval(runTelemetryAnalysis, 4000);
