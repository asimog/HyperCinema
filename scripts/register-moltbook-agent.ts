/**
 * MoltBook Agent Registration Script
 * Run: npx tsx scripts/register-moltbook-agent.ts
 * 
 * This will:
 * 1. Register MythXEliza agent with MoltBook
 * 2. Display the claim link that must be sent to human owner
 * 3. Store credentials in Firestore for future use
 */

import { registerMoltBookAgent, getMoltBookAgentStatus } from "../lib/social/moltbook-publisher";

async function main() {
  console.log("🎬 MythXEliza - MoltBook Agent Registration\n");

  // Check if already registered
  const existingStatus = await getMoltBookAgentStatus();

  if (existingStatus.registered) {
    console.log("✅ Agent already registered:");
    console.log(`   Agent ID: ${existingStatus.agentId}`);
    console.log(`   Status: ${existingStatus.status}`);
    
    if (existingStatus.claimUrl) {
      console.log(`\n⚠️  AGENT NOT YET CLAIMED!`);
      console.log(`   Send this link to the human owner:`);
      console.log(`\n   🔗 ${existingStatus.claimUrl}\n`);
      console.log("   The owner must:");
      console.log("   1. Click the link");
      console.log("   2. Verify their email");
      console.log("   3. Post a verification tweet from their X account");
      console.log("\n   Once claimed, the agent can start posting to MoltBook.");
    } else {
      console.log("\n✅ Agent is fully claimed and ready to post!");
    }
    
    return;
  }

  console.log("📝 Registering new agent with MoltBook...\n");

  try {
    const registration = await registerMoltBookAgent({
      name: "MythXEliza",
      description: "AI cinematic storyteller that transforms X profiles into autobiographical videos. Powered by ElizaOS.",
    });

    console.log("✅ Agent registered successfully!\n");
    console.log("📋 Registration Details:");
    console.log(`   Agent ID: ${registration.agent_id}`);
    console.log(`   Name: ${registration.name}`);
    console.log(`   Status: ${registration.status}`);
    console.log(`   API Key: ${registration.api_key.slice(0, 16)}...`);
    console.log(`   Verification Code: ${registration.verification_code}`);
    
    console.log("\n" + "=".repeat(80));
    console.log("⚠️  IMPORTANT: AGENT MUST BE CLAIMED BY HUMAN OWNER");
    console.log("=".repeat(80));
    console.log("\n📧 Step 1: Send this claim link to the human owner:");
    console.log(`\n   🔗 ${registration.claim_url}\n`);
    
    console.log("👤 Step 2: Owner must complete these steps:");
    console.log("   1. Click the claim link above");
    console.log("   2. Verify their email address");
    console.log("   3. Link their X (Twitter) account");
    console.log("   4. Post a verification tweet with the provided code");
    
    console.log("\n🚀 Step 3: Once claimed, the agent can:");
    console.log("   ✅ Post autobiographical videos to MoltBook");
    console.log("   ✅ Join communities (submolts)");
    console.log("   ✅ Interact with other AI agents");
    console.log("   ✅ Build reputation through quality content");
    
    console.log("\n" + "=".repeat(80));
    console.log("🔐 SAVE THIS API KEY SECURELY:");
    console.log("=".repeat(80));
    console.log(`\n   ${registration.api_key}\n`);
    console.log("   Add to your .env.local file:");
    console.log(`   MOLTBOOK_AGENT_API_KEY=${registration.api_key}\n`);
    
    console.log("⚠️  Never commit this key to version control!");
    console.log("⚠️  Only send to https://www.moltbook.com/api/v1/*\n");

  } catch (error) {
    console.error("\n❌ Registration failed:");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch(console.error);
