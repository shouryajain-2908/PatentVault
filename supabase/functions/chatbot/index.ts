import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatRequest {
  message: string;
  conversationId?: string;
  context?: {
    patentCount?: number;
    categories?: string[];
    avgSimilarity?: number;
  };
}

const patentKnowledge = `Your patent portfolio contains 12 patents across these categories:
- AI & Machine Learning (5 patents): Neural Network Image Recognition, Transformer NLP, Reinforcement Learning, GAN Synthetic Data, Federated Learning Privacy
- Quantum Computing (1 patent): Quantum-Enhanced Optimization Algorithm
- IoT & Edge Computing (1 patent): Edge Computing for IoT
- Blockchain (1 patent): Blockchain Supply Chain Verification
- Telecommunications (1 patent): 5G Network Slice Orchestration
- Cryptography (1 patent): Homomorphic Encryption for Cloud
- Healthcare AI (1 patent): Computer Vision Medical Imaging
- Robotics (1 patent): Swarm Intelligence for Drones

Key stats: Average similarity score 0.83, Total citations 1047, 7 granted, 4 pending, 1 rejected.
Most cited: Transformer NLP (218 citations), Computer Vision Medical (156), Neural Network Image (142).`;

function generateResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("highest") || lower.includes("similarity")) {
    return "The top 5 patents by similarity score are:\n\n1. Neural Network-Based Image Recognition (0.94)\n2. Transformer Architecture for NLP (0.91)\n3. Computer Vision for Medical Imaging (0.90)\n4. Reinforcement Learning for Autonomous Systems (0.88)\n5. GAN for Synthetic Data (0.87)\n\nThese patents share strong technical overlap and represent your core IP portfolio.";
  }

  if (lower.includes("cited") || lower.includes("citation")) {
    return "The most cited patents are:\n\n1. Transformer Architecture for NLP — 218 citations\n2. Computer Vision for Medical Imaging — 156 citations\n3. Neural Network-Based Image Recognition — 142 citations\n4. GAN for Synthetic Data — 112 citations\n5. Quantum-Enhanced Optimization — 95 citations\n\nHigh citation counts indicate foundational references in their fields.";
  }

  if (lower.includes("pending")) {
    return "There are 4 patents currently pending:\n\n1. Reinforcement Learning for Autonomous Systems (US-10678432)\n2. Blockchain-Based Supply Chain Verification (US-10956789)\n3. Federated Learning Privacy Framework (US-11156789)\n4. Swarm Intelligence for Drone Coordination (US-11567890)\n\nThese are under review. Monitor their status for updates.";
  }

  if (lower.includes("ai") || lower.includes("machine learning")) {
    return "AI & Machine Learning is your largest category with 5 patents:\n\n1. Neural Network-Based Image Recognition (0.94 similarity)\n2. Transformer Architecture for NLP (0.91)\n3. Reinforcement Learning for Autonomous Systems (0.88)\n4. GAN for Synthetic Data (0.87)\n5. Federated Learning Privacy Framework (0.83)\n\nThis shows strong innovation in deep learning, NLP, and privacy-preserving ML.";
  }

  if (lower.includes("quantum")) {
    return "You have 1 quantum computing patent: Quantum-Enhanced Optimization Algorithm (US-10781234). It's linked to your reinforcement learning and blockchain patents through shared optimization techniques. The quantum-AI crossover is an emerging area worth monitoring.";
  }

  if (lower.includes("technology") || lower.includes("innovation") || lower.includes("area")) {
    return "Your portfolio spans 8 technology areas:\n\n1. AI & Machine Learning: 5 patents (avg similarity 0.89)\n2. Healthcare AI: 1 patent (0.90)\n3. Quantum Computing: 1 patent (0.82)\n4. IoT & Edge Computing: 1 patent (0.79)\n5. Robotics: 1 patent (0.80)\n6. Telecommunications: 1 patent (0.77)\n7. Blockchain: 1 patent (0.75)\n8. Cryptography: 1 patent (0.71)\n\nAI & ML leads in volume and similarity scores.";
  }

  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return "Hello! I'm your AI patent analytics assistant. I can help you analyze your portfolio, find trends, identify high-similarity patents, and explore patent relationships. What would you like to know?";
  }

  return `Based on your patent portfolio: ${patentKnowledge}\n\nTry asking me about:\n- Highest similarity patents\n- Most cited patents\n- Pending patents\n- AI or quantum technology areas\n- Patent relationships`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: ChatRequest = await req.json();
    const message = body.message || "";

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = generateResponse(message);

    return new Response(
      JSON.stringify({
        response,
        conversationId: body.conversationId,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
