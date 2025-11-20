import { supabase } from "@/lib/supabase";

export const chatbotService = {
    async sendMessage(message, history) {
        // Mock LLM response
        console.log("Sending message to LLM:", message);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simple keyword matching for demo purposes
        const lowerMsg = message.toLowerCase();

        if (lowerMsg.includes('gun') || lowerMsg.includes('firearm')) {
            return {
                content: "Based on the voting records, the Liberal and NDP parties have generally supported recent gun control legislation (Bill C-21), while the Conservative party has opposed it. Here are some relevant MPs and their votes.",
                data: {
                    interpretation: "User is asking about gun control legislation and MP stances.",
                    mps: [
                        {
                            mp: { name: "Marco Mendicino", riding: "Eglinton—Lawrence", party: "Liberal", province: "Ontario" },
                            votes: [{ bill_number: "C-21", bill_title: "Firearms Act Amendment", vote: "Yea" }]
                        },
                        {
                            mp: { name: "Raquel Dancho", riding: "Kildonan—St. Paul", party: "Conservative", province: "Manitoba" },
                            votes: [{ bill_number: "C-21", bill_title: "Firearms Act Amendment", vote: "Nay" }]
                        }
                    ],
                    totalFound: 2
                }
            };
        }

        return {
            content: "I can help you find information about Canadian MPs and bills. Try asking about specific topics like 'healthcare', 'housing', or 'environment', or ask about a specific MP's voting record.",
            data: {
                interpretation: "General inquiry",
                mps: [],
                totalFound: 0
            }
        };
    }
};
