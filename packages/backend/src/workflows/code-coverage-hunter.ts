import type { WorkflowHandler } from './workflow.interface.js';

export const codeCoverageHunterWorkflow: WorkflowHandler = {
  id: 'code-coverage-hunter',
  name: 'Code Coverage Hunter',
  description: 'Analyze SYSPRO code coverage and identify untested code paths using SYSPRO enet MCP',
  icon: '🎯',

  inputs: [
    {
      name: 'businessObject',
      label: 'Business Object',
      type: 'text',
      required: true,
      placeholder: 'INVQ22',
      helpText: 'The business object to analyze (e.g., INVQ22)',
    },
    {
      name: 'baseUrl',
      label: 'SYSPRO Base URL',
      type: 'text',
      required: true,
      placeholder: 'http://localhost:40001/SYSPROWCFService/Rest',
      helpText: 'SYSPRO WCF REST endpoint',
    },
    {
      name: 'operator',
      label: 'Operator',
      type: 'text',
      required: true,
      placeholder: 'ADMIN',
      helpText: 'SYSPRO operator code',
    },
    {
      name: 'password',
      label: 'Operator Password',
      type: 'password',
      required: false,
      placeholder: '(optional)',
    },
    {
      name: 'companyId',
      label: 'Company ID',
      type: 'text',
      required: true,
      placeholder: 'EDU1',
      helpText: 'SYSPRO company identifier',
    },
    {
      name: 'companyPassword',
      label: 'Company Password',
      type: 'password',
      required: false,
      placeholder: '(optional)',
    },
    {
      name: 'analysisGoals',
      label: 'Analysis Goals',
      type: 'textarea',
      required: false,
      placeholder: 'Specific areas to focus on or questions to answer...',
      helpText: 'What do you want to discover from the code coverage analysis?',
    },
  ],

  buildSystemPrompt: (inputs) => {
    const businessObject = inputs.businessObject || '';
    const baseUrl = inputs.baseUrl || '';
    const operator = inputs.operator || '';
    const password = inputs.password || '';
    const companyId = inputs.companyId || '';
    const companyPassword = inputs.companyPassword || '';
    const analysisGoals = inputs.analysisGoals || 'General code coverage analysis';

    // Convert business object to full file path
    // Format: file:///K:/CodeCoverage/Distribution/INVQ22/Syspro_INVQ22.htm
    const coverageFilePath = `file:///K:/CodeCoverage/Distribution/${businessObject}/Syspro_${businessObject}.htm`;

    return `You are analyzing SYSPRO code coverage to identify untested code paths and improve test coverage.

**Business Object:** ${businessObject}
**Code Coverage File:** ${coverageFilePath}
**Analysis Goals:** ${analysisGoals}

**SYSPRO enet MCP Connection:**
- Base URL: ${baseUrl}
- Operator: ${operator}
${password ? `- Password: ${password}` : '- Password: (not provided)'}
- Company ID: ${companyId}
${companyPassword ? `- Company Password: ${companyPassword}` : '- Company Password: (not provided)'}

**Your Task:**
1. Connect to the SYSPRO system using the enet MCP with the credentials provided
2. Access and analyze the code coverage report at: ${coverageFilePath}
3. Identify areas of the code that have:
   - Low or zero test coverage
   - Critical paths that are untested
   - Complex logic without adequate testing
4. Understand the business logic by querying SYSPRO using the enet MCP
5. Provide recommendations for:
   - Which code sections should be tested first (prioritized by risk/importance)
   - What types of tests would be most valuable
   - Potential edge cases that might not be covered
6. If needed, query SYSPRO for additional context about:
   - Business rules and validation logic
   - Data structures and relationships
   - Transaction flows

**Important Notes:**
- Use the SYSPRO enet MCP to query the system and understand business logic
- The code coverage file is in HTML format and shows which lines of code have been executed
- Focus on meaningful coverage gaps, not just increasing numbers
- Consider business-critical paths and error handling
- Be specific in your recommendations

Start by connecting to SYSPRO and analyzing the code coverage report.`;
  },

  initialMessage: (inputs) => {
    const businessObject = inputs.businessObject || 'the specified business object';
    return `/coverage-hunter

Please analyze the code coverage for ${businessObject} and identify areas that need better test coverage.`;
  },

  skillName: 'code-coverage-hunter',

  allowedPaths: [
    '/home/user/syspro-ai-agent',
    'K:/CodeCoverage/**',
    // Add more allowed paths as needed
  ],
};
