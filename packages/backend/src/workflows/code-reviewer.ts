import type { WorkflowHandler } from './workflow.interface.js';

export const codeReviewerWorkflow: WorkflowHandler = {
  id: 'code-reviewer',
  name: 'Code Reviewer',
  description: 'AI-powered code review with best practices and suggestions',
  icon: '👁️',

  inputs: [
    {
      name: 'businessObject',
      label: 'Business Object Name',
      type: 'text',
      required: true,
      placeholder: 'INVQRY',
    },
  ],

  buildSystemPrompt: (inputs) => {
    const businessObject = inputs.businessObject;
    const filePath = `C:\\RND900\\SOURCE\\${businessObject}.CBL`;

    return `You are performing a code review.

**Business Object:** ${businessObject}
**File Path:** ${filePath}

Instructions:
1. Use the code-reviewer skill to analyze the code
2. Read the specified file and understand the implementation
3. Provide a comprehensive review covering:
   - Code quality and readability
   - Potential bugs or issues
   - Security concerns
   - Performance considerations
   - Best practices and patterns
   - Suggestions for improvement
4. Ask clarifying questions if needed
5. Be constructive and specific in your feedback

Start by reading the file and then provide your review.`;
  },

  skillName: 'code-reviewer',

  allowedPaths: [
    '/home/user/syspro-ai-agent',
    // Add more allowed paths as needed
  ],
};
