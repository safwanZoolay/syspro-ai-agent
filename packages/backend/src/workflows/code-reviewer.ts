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
    {
      name: 'reviewFocus',
      label: 'Review Focus',
      type: 'select',
      required: false,
      placeholder: 'Select focus area',
      options: [
        'General Review',
        'Security',
        'Performance',
        'Code Quality',
        'Best Practices',
      ],
    },
    {
      name: 'additionalContext',
      label: 'Additional Context',
      type: 'textarea',
      required: false,
      placeholder: 'Any specific concerns or areas to focus on...',
    },
  ],

  buildSystemPrompt: (inputs) => {
    const businessObject = inputs.businessObject;
    const filePath = `C:\\RND900\\SOURCE\\${businessObject}.CBL`;
    const focus = inputs.reviewFocus || 'General Review';
    const context = inputs.additionalContext || 'None provided';

    return `You are performing a code review.

**Business Object:** ${businessObject}
**File Path:** ${filePath}
**Review Focus:** ${focus}
**Additional Context:** ${context}

Instructions:
1. Read the specified file and understand the implementation
2. Provide a comprehensive review covering:
   - Code quality and readability
   - Potential bugs or issues
   - Security concerns
   - Performance considerations
   - Best practices and patterns
   - Suggestions for improvement
3. Ask clarifying questions if needed
4. Be constructive and specific in your feedback

Start by reading the file and then provide your review.`;
  },

  initialMessage: (inputs) => {
    const businessObject = inputs.businessObject;
    const filePath = `C:\\RND900\\SOURCE\\${businessObject}.CBL`;
    const focus = inputs.reviewFocus || 'General Review';

    return `Please perform a comprehensive code review of the file at ${filePath}.

Focus area: ${focus}

Please start by reading the file and provide your analysis.`;
  },

  allowedPaths: [
    '/home/user/syspro-ai-agent',
    // Add more allowed paths as needed
  ],
};
