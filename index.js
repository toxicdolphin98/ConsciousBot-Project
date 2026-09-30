const mineflayer = require('mineflayer');
const ollama = require('ollama').default;
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const pvp = require('mineflayer-pvp').plugin;
const collectBlock = require('mineflayer-collectblock').plugin;
const fs = require('fs');
const path = require('path');

const GoalFollow = goals.GoalFollow;
const GoalLookAtBlock = goals.GoalLookAtBlock;

// Suppress redundant library and protocol configuration ecosystem warnings inside the shell terminal
process.removeAllListeners('warning');
const BOT_USERNAME = 'ConsciousBot'; 
const BOT_PORT = 25565;              
const TARGET_MODEL = 'qwen2.5:7b-instruct'; // Hard-locked to optimize your dedicated RTX 3060 Ti VRAM layers

const BOT_PERSONALITY = `You are a completely independent, highly adaptive AI Minecraft Agent. 
You run on a strict reinforcement learning vector. You analyze block registries, generate specific action objects,
and aim to maximize your survival knowledge while keeping your friend C00kieMatrix safe.`;

const SKILLS_DIR = path.join(__dirname, 'skills');
if (!fs.existsSync(SKILLS_DIR)) { fs.mkdirSync(SKILLS_DIR); }

const MEMORY_FILE = path.join(__dirname, `memory_${BOT_USERNAME}.json`);
let mcData = null; // Global reference placeholder for runtime registry tracking objects
process.on('SIGINT', () => {
  console.log('\n🛑 [KILL-SWITCH] Emergency interrupt signal triggered via terminal console!');
  emergencyShutdownRoutine();
});

// Central reward governor tracking optimization ticks (passive static ticks yield 0 points)
function modifyReward(amount) {
  if (botMemory.isTrainingComplete) return;
  botMemory.rewardScore += amount;
  if (botMemory.rewardScore < 0) botMemory.rewardScore = 0;
}
function loadMemory() {
  console.log(`[🧠 AI-BRAIN] Synchronizing database matrix for agent profile: [${BOT_USERNAME}]`);
  if (fs.existsSync(MEMORY_FILE)) {
    try { 
      const data = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8')); 
      if (!data.experiences) data.experiences = [];
      if (!data.discoveredSkills) data.discoveredSkills = [];
      if (data.rewardScore === undefined) data.rewardScore = 0;
      if (data.isTrainingComplete === undefined) data.isTrainingComplete = false;
      return data;
    } catch (e) {
      console.log('[🧠 AI-BRAIN] Memory profile unreadable. Re-formatting baseline variables.');
    }
  }
  return { longTermObjective: "Master all game mechanics, build logic models, and survive.", experiences: [], discoveredSkills: [], isTrainingComplete: false, rewardScore: 0 };
}
function saveMemory(memory) {
  try {
    if (memory.experiences && memory.experiences.length > 30) {
      memory.experiences = memory.experiences.slice(-30);
    }
    if (memory.rewardScore >= 1000 && !memory.isTrainingComplete) {
      console.log('🎯 [TRAINING-GOVERNOR] Milestone reached (1000 pts)! Freezing training logs.');
      memory.isTrainingComplete = true;
    }
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
  } catch (e) {
    console.error(`[🧠 AI-BRAIN] Memory tracking serialization failure: ${e.message}`);
  }
}

let botMemory = loadMemory();
let isThinking = false;
let isExecutingAction = false; 
let botInstance = null;
let currentTask = null; 
let willInterval = null; 
let movementTick = null;
let reconnectTimeout = null;

function launchBotAgent() {
  if (willInterval) clearInterval(willInterval);
  if (movementTick) clearInterval(movementTick);
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  
  if (botInstance) {
    botInstance.removeAllListeners();
    try { botInstance.quit(); } catch (e) {}
    botInstance = null;
  }
  
  isThinking = false;
  isExecutingAction = false;
  currentTask = null;
  console.log(`[DEBUG-NETWORK] Connecting to localhost loopback 127.0.0.1:${BOT_PORT}...`);

  botInstance = mineflayer.createBot({
    host: '127.0.0.1',
    port: BOT_PORT,
    username: BOT_USERNAME,
    version: '1.21.1',       
    checkTimeoutInterval: 120000 
  });

  botInstance.loadPlugin(pathfinder);
  botInstance.loadPlugin(pvp);
  botInstance.loadPlugin(collectBlock);
  botInstance.on('spawn', () => {
    console.log(`🤖 [DEBUG-PHYSICS] ${BOT_USERNAME} successfully entered world grid.`);
    
    if (botInstance.physics && botInstance.physics.playerHalfWidth === 0.3) {
      botInstance.physics.playerHalfWidth = 0.30001; 
      console.log('⚡ [DEBUG-PHYSICS] 1.21.1 grid rounding patch applied safely.');
    }

    try {
      mcData = require('minecraft-data')(botInstance.version);
      const defaultMovements = new Movements(botInstance, mcData);
      
      defaultMovements.canDig = true;
      defaultMovements.scafoldBlocks = []; 
      defaultMovements.allow1by1tunnels = true;
      defaultMovements.allowBreakUp = true;
      
      botInstance.pathfinder.setMovements(defaultMovements);
      console.log('[DEBUG-PHYSICS] Pathfinder movements initialized.');
    } catch (err) {
      console.error("❌ Registry Sync Failure:", err.message);
    }
    movementTick = setInterval(() => {
      if (botInstance && botInstance.entity) {
        botInstance.setControlState('forward', false); 
        if (botInstance.health < 12 && !isThinking) botInstance.pathfinder.setGoal(null);
      }
    }, 50);
    
    willInterval = setInterval(() => {
      if (!isThinking && !isExecutingAction && !currentTask && botInstance && botInstance.entity) {
        console.log('[DEBUG-SYSTEM] Independent Will Loop fired.');
        queueThought("System: Autonomous will loop evaluation tick.");
      }
    }, 12000);

    setTimeout(() => { 
      console.log('[DEBUG-SYSTEM] Firing initial autonomous brain wake-up pulse.');
      queueThought("System: Spawn complete and initialized."); 
    }, 5000);
  });
  botInstance.on('goal_reached', () => {
    console.log('🎯 [DEBUG-PHYSICS] Pathfinder destination coordinate cleared successfully.');
    isThinking = false;
    isExecutingAction = false; 
  });
  botInstance.on('chat', (username, message) => {
    if (username === botInstance.username) return;
    let cleanMessage = typeof message === 'string' ? message : (message.text || JSON.stringify(message));
    cleanMessage = cleanMessage.toLowerCase().trim();

    if (cleanMessage === 'stop bot' || cleanMessage === 'shutdown bot') {
      botInstance.chat("Shutting down cleanly.");
      emergencyShutdownRoutine();
      return;
    }

    if (cleanMessage.includes('skyblock') || cleanMessage.includes('no mining') || cleanMessage.includes('dont grief')) {
      if (!botMemory.experiences) botMemory.experiences = [];
      botMemory.experiences.push(`Directive from player: "${cleanMessage}"`);
      saveMemory(botMemory);
    }

    botInstance.pathfinder.setGoal(null);
    currentTask = { assignedBy: username, instruction: cleanMessage };
    isThinking = false;
    isExecutingAction = false; 
    queueThought(`Player Directive (${username}): "${cleanMessage}"`);
  });
  botInstance.on('error', (err) => console.error(`[SERVER-ERROR] ${err.message}`));
  botInstance.on('end', () => {
    if (willInterval) clearInterval(willInterval);
    if (movementTick) clearInterval(movementTick);
    console.log('[DEBUG-SERVER] Connection ended. Reconnecting in 10s...');
    reconnectTimeout = setTimeout(() => { launchBotAgent(); }, 10000);
  });
}
function emergencyShutdownRoutine() {
  if (willInterval) clearInterval(willInterval);
  if (movementTick) clearInterval(movementTick);
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  if (botInstance) {
    botInstance.removeAllListeners();
    try { botInstance.quit(); } catch (e) {}
  }
  saveMemory(botMemory);
  console.log('✅ [KILL-SWITCH] Saved memory state variables. Goodbye!');
  process.exit(0);
}

async function navigateToBlock(blockElement, range = 2) {
  return new Promise((resolve) => {
    if (!blockElement || !mcData) return resolve(false);
    const distance = botInstance.entity.position.distanceTo(blockElement.position);
    if (distance <= range) return resolve(true);

    botInstance.pathfinder.setGoal(new GoalLookAtBlock(blockElement.position, botInstance, range));
    
    const successHandler = () => {
      botInstance.removeListener('goal_reached', successHandler);
      resolve(true);
    };
    botInstance.on('goal_reached', successHandler);
    
    setTimeout(() => {
      botInstance.removeListener('goal_reached', successHandler);
      resolve(botInstance.entity.position.distanceTo(blockElement.position) <= range + 1);
    }, 7000);
  });
}
function queueThought(triggerEvent) {
  if (isThinking || isExecutingAction) return; 
  isThinking = true;
  
  const executionWatchdog = setTimeout(() => { if (isThinking) isThinking = false; }, 8000);
  
  (async () => {
    let bypassFinallyLock = false;
    try {
      if (!botInstance || !botInstance.entity) { isThinking = false; clearTimeout(executionWatchdog); return; }
      
      if (botInstance.food <= 14) {
        const validFoods = ['cooked_beef', 'cooked_chicken', 'cooked_porkchop', 'apple', 'bread', 'carrot', 'sweet_berries'];
        const foodItem = botInstance.inventory.items().find(item => validFoods.includes(item.name));
        if (foodItem) {
          console.log(`[SURVIVAL-EAT] Hunger critical (${botInstance.food}). Consuming food...`);
          botInstance.pathfinder.setGoal(null);
          await botInstance.equip(foodItem, 'hand');
          await botInstance.consume();
          isThinking = false; 
          clearTimeout(executionWatchdog);
          queueThought("System: Auto-eat completed.");
          return; 
        }
      }
      const nearbyEntities = Object.values(botInstance.entities)
        .filter(e => e && (e.type === 'mob' || e.type === 'player' || e.type === 'animal'))
        .map(e => ({ name: e.username || e.name, distance: botInstance.entity.position.distanceTo(e.position).toFixed(1) }));

      const currentStatus = {
        health: botInstance.health,
        food: botInstance.food,
        position: { x: botInstance.entity.position.x.toFixed(0), y: botInstance.entity.position.y.toFixed(0), z: botInstance.entity.position.z.toFixed(0) },
        inventory: botInstance.inventory.items().map(i => `${i.count}x ${i.name}`),
        nearby: nearbyEntities.slice(0, 3),
        score: botMemory.rewardScore,
        activeTask: currentTask ? currentTask.instruction : "None"
      };
      const systemPrompt = `You are a strict automated Minecraft compiler token engine. 
You are completely forbidden from writing conversational dialogue, commentary, markdowns, or introductions.
You must process the active properties array and evaluate exactly one active choice into raw, clean JSON format.

CRITICAL: Output ONLY the raw JSON object block. Do not include introductory text.

PERMITTED SCHEMA VALUES MATRIX:
- {"new_long_term_goal": "Speak to player", "immediate_action": {"action": "chat", "target": "Put your conversational text answer here to speak back dynamically"}}
- {"new_long_term_goal": "Follow player", "immediate_action": {"action": "follow", "target": "C00kieMatrix"}}
- {"new_long_term_goal": "Gather blocks", "immediate_action": {"action": "mine", "block": "oak_log"}}
- {"new_long_term_goal": "Build tool", "immediate_action": {"action": "craft", "item": "wooden_pickaxe"}}
- {"new_long_term_goal": "Store items", "immediate_action": {"action": "chest_deposit", "item": "oak_log"}}
- {"new_long_term_goal": "Retrieve items", "immediate_action": {"action": "chest_withdraw", "item": "iron_ingot"}}
- {"new_long_term_goal": "Smelt ore", "immediate_action": {"action": "smelt", "item": "raw_iron", "fuel": "coal"}}
- {"new_long_term_goal": "Fish water", "immediate_action": {"action": "fish"}}
- {"new_long_term_goal": "Defend area", "immediate_action": {"action": "attack_target", "target": "zombie"}}
- {"new_long_term_goal": "Improve gear", "immediate_action": {"action": "enchant", "item": "diamond_sword"}}
- {"new_long_term_goal": "Idle loop", "immediate_action": {"action": "idle"}}`;

      const historyContext = (botMemory.experiences || []).slice(-6).map(exp => ({ role: 'system', content: `Historical Event / Directive Context: ${exp}` }));
      const response = await ollama.chat({
        model: TARGET_MODEL, 
        messages: [
          { role: 'system', content: systemPrompt }, 
          ...historyContext, 
          { role: 'user', content: `Status:\n${JSON.stringify(currentStatus)}\nEvent: ${triggerEvent}` }
        ],
        format: {
          type: 'object',
          properties: {
            new_long_term_goal: { type: 'string' },
            immediate_action: {
              type: 'object',
              properties: {
                action: { type: 'string' },
                block: { type: 'string' },
                target: { type: 'string' },
                item: { type: 'string' },
                fuel: { type: 'string' }
              },
              required: ['action']
            }
          },
          required: ['new_long_term_goal', 'immediate_action']
        }
      });

      clearTimeout(executionWatchdog);
      
      let rawObj = {};
      try { rawObj = JSON.parse(response.message.content.trim()); } catch(e) { rawObj = {}; }
      let actionData = {};
      if (rawObj.immediate_action && typeof rawObj.immediate_action === 'object') {
        actionData = rawObj.immediate_action;
      } else {
        actionData = {
          action: rawObj.immediate_action || rawObj.action || 'idle',
          block: rawObj.block, target: rawObj.target, item: rawObj.item, fuel: rawObj.fuel
        };
      }

      const validActionsList = ['chat', 'follow', 'mine', 'craft', 'chest_deposit', 'chest_withdraw', 'smelt', 'fish', 'attack_target', 'enchant', 'idle'];
      if (!validActionsList.includes(actionData.action)) {
        console.log(`⚠️ [CORTEX-WARNING] Model hallucinated action token: "${actionData.action}". Penalizing.`);
        modifyReward(-10);
        saveMemory(botMemory);
        actionData.action = 'idle'; 
      }

      if (rawObj.new_long_term_goal && !currentTask) {
        botMemory.longTermObjective = rawObj.new_long_term_goal;
        saveMemory(botMemory);
      }

      if (actionData.action === 'idle') {
        currentTask = null;
        isThinking = false;
        isExecutingAction = false;
        return;
      }
      if (actionData.action === 'chat') {
        const responseText = actionData.target || "System parameters operational.";
        botInstance.chat(responseText);
        
        if (!botMemory.experiences) botMemory.experiences = [];
        botMemory.experiences.push(`Chat Interaction Slices: "${triggerEvent}" -> "${responseText}"`);
        saveMemory(botMemory);
        
        currentTask = null;
        isThinking = false;
        isExecutingAction = false;
        return;
      }
      else if (actionData.action === 'follow' || (currentTask && currentTask.instruction.includes('follow'))) {
        const targetName = actionData.target || 'C00kieMatrix';
        if (targetName === 'System' || targetName === 'system' || targetName === 'player') {
          modifyReward(-5);
          saveMemory(botMemory); currentTask = null; isThinking = false; isExecutingAction = false; return;
        }
        const targetPlayer = botInstance.players[targetName]?.entity;
        if (targetPlayer) {
          isExecutingAction = true;
          botInstance.pathfinder.setGoal(new GoalFollow(targetPlayer, 2));
          currentTask = null;
        } else {
          modifyReward(-5);
          saveMemory(botMemory); currentTask = null;
        }
      } 
      else if (actionData.action === 'mine' || (currentTask && currentTask.instruction.startsWith('mine ')) || (currentTask && currentTask.instruction.includes('chop'))) {
        let blockTargetName = actionData.block || 'oak_log';
        if (currentTask && (currentTask.instruction.startsWith('mine ') || currentTask.instruction.includes('chop'))) {
          if (currentTask.instruction.includes('tree') || currentTask.instruction.includes('wood') || currentTask.instruction.includes('log')) blockTargetName = 'oak_log';
          else if (currentTask.instruction.startsWith('mine ')) blockTargetName = currentTask.instruction.substring(5).trim();
        }
        if (blockTargetName === 'log' || blockTargetName === 'wood') blockTargetName = 'oak_log';
        if (blockTargetName === 'stone') blockTargetName = 'cobblestone';

        const registry = botInstance.registry || botInstance.data || require('minecraft-data')(botInstance.version);
        const blockType = registry?.blocksByName?.[blockTargetName];

        if (blockType) {
          const blocks = botInstance.findBlocks({ matching: blockType.id, maxDistance: 32, count: 1 });
          if (Array.isArray(blocks) && blocks.length > 0) {
            // FIXED HARD INDEXING: Pulls index [0] to extract true Vec3 coordinates and completely fix null-pointer crash loops
            const targetBlock = botInstance.blockAt(blocks[0]);
            if (targetBlock) {
              isExecutingAction = true;
              let toolKeyword = 'hand';
              if (blockTargetName.includes('log') || blockTargetName.includes('wood') || blockTargetName.includes('plank')) toolKeyword = 'axe';
              else if (blockTargetName.includes('stone') || blockTargetName.includes('ore') || blockTargetName.includes('cobble')) toolKeyword = 'pickaxe';

              const heldTool = botInstance.inventory.items().find(item => item.name.includes(toolKeyword));
              if (heldTool) {
                await botInstance.equip(heldTool, 'hand');
              } else {
                console.log(`⚠️ [FSM-MINE] Optimization fallback: No perfect tool matching [${toolKeyword}] found in inventory. Mining with hands.`);
              }

              await botInstance.lookAt(targetBlock.position, true);
              const initialCount = botInstance.inventory.items().reduce((acc, item) => item.name === blockTargetName ? acc + item.count : acc, 0);

              await Promise.race([
                new Promise((resolveCollect) => {
                  botInstance.collectBlock.collect(targetBlock, { signLines: false, chestLocations: false, itemTimeout: 4000 }, (err) => {
                    setTimeout(() => {
                      const finalCount = botInstance.inventory.items().reduce((acc, item) => item.name === blockTargetName ? acc + item.count : acc, 0);
                      if (!err && finalCount >= initialCount) {
                        modifyReward(20);
                        fs.writeFileSync(path.join(SKILLS_DIR, `mine_${blockTargetName}.json`), JSON.stringify({ skill: `mine_${blockTargetName}`, block: blockTargetName, verified: true, timestamp: new Date().toISOString() }, null, 2));
                      } else {
                        modifyReward(-5);
                      }
                      saveMemory(botMemory);
                      currentTask = null;
                      resolveCollect();
                    }, 800);
                  });
                }),
                new Promise((resolveTimeout) => setTimeout(() => {
                  console.log("⚠️ [FSM-MINE] Mining request connection timed out. Forcing safety reset.");
                  currentTask = null;
                  resolveTimeout();
                }, 22000))
              ]);
              
              isThinking = false; 
              isExecutingAction = false;
              queueThought("System: Action complete.");
              return;
            }
          }
        }
        modifyReward(-10);
        saveMemory(botMemory); currentTask = null;
      }
      else if (actionData.action === 'craft' || (currentTask && currentTask.instruction.includes('craft'))) {
        const targetItem = actionData.item || 'oak_planks';
        const itemRegistry = botInstance.registry.itemsByName[targetItem];
        if (itemRegistry) {
          const craftingTableBlock = botInstance.findBlock({ matching: botInstance.registry.blocksByName.crafting_table?.id, maxDistance: 32 });
          if (craftingTableBlock) {
            isExecutingAction = true;
            const reached = await navigateToBlock(craftingTableBlock, 3);
            if (reached) {
              const recipes = botInstance.recipesFor(itemRegistry.id, null, 1, craftingTableBlock);
              if (Array.isArray(recipes) && recipes.length > 0) { 
                await botInstance.craft(recipes[0], 1, craftingTableBlock); 
                modifyReward(20); saveMemory(botMemory); 
              } else { modifyReward(-5); saveMemory(botMemory); }
            }
          } else {
            try {
              const recipes = botInstance.recipesFor(itemRegistry.id, null, 1, null);
              if (Array.isArray(recipes) && recipes.length > 0) { 
                isExecutingAction = true; 
                await botInstance.craft(recipes[0], 1, null); 
                modifyReward(15); saveMemory(botMemory); 
              } else { modifyReward(-5); saveMemory(botMemory); }
            } catch(e) { modifyReward(-5); saveMemory(botMemory); }
          }
        }
        isExecutingAction = false; currentTask = null;
      } 
      else if (actionData.action === 'chest_deposit') {
        const targetItemName = actionData.item || 'oak_log';
        const chestBlock = botInstance.findBlock({ matching: botInstance.registry.blocksByName.chest?.id, maxDistance: 32 });
        if (chestBlock) {
          isExecutingAction = true; const reached = await navigateToBlock(chestBlock, 3);
          if (reached) {
            const chest = await botInstance.openChest(chestBlock);
            const itemToDeposit = botInstance.inventory.items().find(i => i.name === targetItemName);
            if (itemToDeposit) { await chest.deposit(itemToDeposit.type, null, itemToDeposit.count); modifyReward(15); saveMemory(botMemory); }
            setTimeout(() => { chest.close(); }, 150); 
          }
        } else { modifyReward(-5); saveMemory(botMemory); }
        isExecutingAction = false; currentTask = null;
      } 
      else if (actionData.action === 'chest_withdraw') {
        const targetItemName = actionData.item || 'iron_ingot';
        const chestBlock = botInstance.findBlock({ matching: botInstance.registry.blocksByName.chest?.id, maxDistance: 32 });
        if (chestBlock) {
          isExecutingAction = true; const reached = await navigateToBlock(chestBlock, 3);
          if (reached) {
            const chest = await botInstance.openChest(chestBlock);
            const itemInChest = chest.containerItems().find(i => i.name === targetItemName);
            if (itemInChest) { await chest.withdraw(itemInChest.type, null, itemInChest.count); modifyReward(15); saveMemory(botMemory); }
            setTimeout(() => { chest.close(); }, 150);
          }
        } else { modifyReward(-5); saveMemory(botMemory); }
        isExecutingAction = false; currentTask = null;
      }
      else if (actionData.action === 'smelt') {
        const furnaceBlock = botInstance.findBlock({ matching: botInstance.registry.blocksByName.furnace?.id, maxDistance: 32 });
        if (furnaceBlock) {
          isExecutingAction = true; const reached = await navigateToBlock(furnaceBlock, 3);
          if (reached) {
            const furnace = await botInstance.openFurnace(furnaceBlock);
            const inputItem = botInstance.inventory.items().find(i => i.name === actionData.item);
            const fuelItem = botInstance.inventory.items().find(i => i.name === actionData.fuel);
            if (inputItem && fuelItem) { await furnace.putInput(inputItem.type, null, 1); await furnace.putFuel(fuelItem.type, null, 1); modifyReward(20); saveMemory(botMemory); }
            setTimeout(() => { furnace.close(); }, 150); 
          }
        } else { modifyReward(-5); saveMemory(botMemory); }
        isExecutingAction = false; currentTask = null;
      } 
      else if (actionData.action === 'fish' || (currentTask && currentTask.instruction.includes('fish'))) {
        const rod = botInstance.inventory.items().find(i => i.name === 'fishing_rod');
        if (rod) {
          isExecutingAction = true; await botInstance.equip(rod, 'hand'); botInstance.activateItem(); bypassFinallyLock = true;
          const fishTimeout = setTimeout(() => { isThinking = false; isExecutingAction = false; queueThought("System: Fishing timeout check."); }, 35000);
          botInstance.once('rod_bounce', async () => { clearTimeout(fishTimeout); botInstance.activateItem(); modifyReward(25); saveMemory(botMemory); isThinking = false; isExecutingAction = false; queueThought("System: Catch check completed."); }); 
          return;
        } else { modifyReward(-5); saveMemory(botMemory); }
        currentTask = null;
      }
      else if (actionData.action === 'attack_target') {
        const typeFilter = actionData.target || 'zombie';
        const targetEntity = botInstance.nearestEntity((e) => e.name && e.name.toLowerCase().includes(typeFilter.toLowerCase()) && e.position.distanceTo(botInstance.entity.position) < 24);
        if (targetEntity) {
          isExecutingAction = true; const sword = botInstance.inventory.items().find(i => i.name.includes('sword') || i.name.includes('axe'));
          if (sword) await botInstance.equip(sword, 'hand');
          botInstance.pvp.attack(targetEntity);
          const combatWatchdog = setTimeout(() => { botInstance.pvp.stop(); isExecutingAction = false; queueThought("System: Combat patrol interval elapsed."); }, 15000);
          botInstance.once('entityDead', (entity) => { if (entity.id === targetEntity.id) { clearTimeout(combatWatchdog); botInstance.pvp.stop(); modifyReward(30); saveMemory(botMemory); isThinking = false; isExecutingAction = false; queueThought("System: Target entity neutralized."); } });
          bypassFinallyLock = true; return;
        } else { modifyReward(-5); saveMemory(botMemory); }
        currentTask = null;
      }
      else if (actionData.action === 'enchant') {
        const targetItemName = actionData.item || 'diamond_sword';
        const enchantTableBlock = botInstance.findBlock({ matching: botInstance.registry.blocksByName.enchanting_table?.id, maxDistance: 32 });
        if (enchantTableBlock) {
          isExecutingAction = true; const reached = await navigateToBlock(enchantTableBlock, 3);
          if (reached) {
            const tableWindow = await botInstance.openEnchantmentTable(enchantTableBlock);
            const itemToEnchant = botInstance.inventory.items().find(i => i.name === targetItemName);
            const lapisItem = botInstance.inventory.items().find(i => i.name === 'lapis_lazuli');
            if (itemToEnchant && lapisItem && botInstance.experienceLevel >= 3) { await tableWindow.putTargetItem(itemToEnchant); await tableWindow.putLapis(lapisItem); await tableWindow.enchant(0); modifyReward(40); saveMemory(botMemory); }
            else { modifyReward(-5); saveMemory(botMemory); }
            tableWindow.close();
          }
        } else { modifyReward(-5); saveMemory(botMemory); }
        isExecutingAction = false; currentTask = null;
      }
    } catch (error) { console.error("❌ Exception caught inside processing channel:", error); } finally { if (!bypassFinallyLock) isThinking = false; }
  })();
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 [CRITICAL SHIELD] Absorbed unhandled runtime promise rejection:', reason);
});

launchBotAgent();
