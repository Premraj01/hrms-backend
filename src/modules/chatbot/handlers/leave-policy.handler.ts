import { Injectable, Logger } from '@nestjs/common';
import { IActionHandler, ActionContext, ActionResult } from './action-handler.interface';
import { Intent } from '../services/intent-detection.service';

@Injectable()
export class LeavePolicyHandler implements IActionHandler {
  readonly supportedIntent = Intent.LEAVE_POLICY;
  private readonly logger = new Logger(LeavePolicyHandler.name);

  canExecute(context: ActionContext): boolean {
    return context.intentResult.intent === this.supportedIntent;
  }

  async execute(context: ActionContext): Promise<ActionResult> {
    try {
      const { intentResult } = context;
      const { entities } = intentResult;

      this.logger.log(`Providing leave policy information`);

      const leaveType = entities.leaveType || null;

      // Generate response based on leave type
      const response = leaveType
        ? this.getSpecificLeavePolicy(leaveType)
        : this.getGeneralLeavePolicy();

      return {
        success: true,
        message: response,
      };
    } catch (error) {
      this.logger.error(`Error providing leave policy: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'I encountered an error while fetching leave policy information. Please contact HR for details.',
      };
    }
  }

  private getGeneralLeavePolicy(): string {
    return `📚 **Leave Policy Overview**

Our organization offers the following types of leave:

**1. Annual Leave (20 days/year)**
   • For planned vacations and personal time off
   • Requires advance notice (preferably 2 weeks)
   • Can be carried forward (max 5 days)

**2. Sick Leave (10 days/year)**
   • For illness or medical appointments
   • Medical certificate required for 3+ consecutive days
   • Cannot be carried forward

**3. Casual Leave (7 days/year)**
   • For short-term, unplanned absences
   • Can be taken at short notice
   • Cannot be carried forward

**4. Personal Leave (5 days/year)**
   • For personal matters and emergencies
   • Requires manager approval
   • Cannot be carried forward

**5. Work From Home (12 days/year)**
   • For remote work arrangements
   • Requires advance notice
   • Subject to manager approval

**6. Compensatory Leave**
   • Earned for working on holidays/weekends
   • Must be used within 3 months
   • Requires prior approval

**General Rules:**
• All leaves require manager approval
• Apply for leave at least 24 hours in advance (except emergencies)
• Maximum 15 consecutive days without special approval
• Leave balance resets annually on January 1st

💡 **Need more details?** Ask me about a specific leave type (e.g., "What is sick leave policy?")`;
  }

  private getSpecificLeavePolicy(leaveType: string): string {
    const policies = {
      Annual: `📚 **Annual Leave Policy**

**Entitlement:** 20 days per year

**Purpose:**
• Planned vacations
• Extended time off
• Personal relaxation and rejuvenation

**Rules:**
• Requires advance notice (preferably 2 weeks)
• Manager approval required
• Can be taken in blocks or single days
• Maximum 15 consecutive days without special approval
• Unused leave can be carried forward (max 5 days)

**How to Apply:**
• Submit request through HRMS or chatbot
• Specify dates and reason
• Wait for manager approval
• Plan ahead for busy periods

💡 **Tip:** You can apply by saying "Apply for annual leave from Jan 15 to Jan 20"`,

      Sick: `📚 **Sick Leave Policy**

**Entitlement:** 10 days per year

**Purpose:**
• Illness or injury
• Medical appointments
• Recovery time

**Rules:**
• Can be taken at short notice
• Medical certificate required for 3+ consecutive days
• Inform manager as soon as possible
• Cannot be carried forward to next year
• Unused sick leave expires on Dec 31

**How to Apply:**
• Notify manager immediately if sick
• Submit request through HRMS or chatbot
• Provide medical certificate if required

💡 **Tip:** You can apply by saying "Apply for sick leave tomorrow"`,

      Casual: `📚 **Casual Leave Policy**

**Entitlement:** 7 days per year

**Purpose:**
• Short-term, unplanned absences
• Personal errands
• Family matters

**Rules:**
• Can be taken at short notice
• Minimum 24 hours notice preferred
• Cannot be combined with sick leave
• Cannot be carried forward
• Maximum 3 consecutive days

**How to Apply:**
• Submit request through HRMS or chatbot
• Brief reason required
• Manager approval needed

💡 **Tip:** You can apply by saying "Apply for casual leave tomorrow"`,

      Personal: `📚 **Personal Leave Policy**

**Entitlement:** 5 days per year

**Purpose:**
• Personal emergencies
• Family obligations
• Important personal matters

**Rules:**
• Requires manager approval
• Advance notice preferred
• Cannot be carried forward
• May require documentation

**How to Apply:**
• Submit request through HRMS or chatbot
• Provide reason for leave
• Wait for manager approval

💡 **Tip:** You can apply by saying "Apply for personal leave on Jan 15"`,

      WFH: `📚 **Work From Home Policy**

**Entitlement:** 12 days per year

**Purpose:**
• Remote work arrangements
• Flexible work options
• Better work-life balance

**Rules:**
• Requires advance notice (24 hours minimum)
• Manager approval required
• Must be available during work hours
• Must have stable internet connection
• Cannot be carried forward

**How to Apply:**
• Submit request through HRMS or chatbot
• Specify date and reason
• Ensure work deliverables are met

💡 **Tip:** You can apply by saying "Apply for WFH tomorrow"`,

      Compensatory: `📚 **Compensatory Leave Policy**

**Entitlement:** Earned basis (no fixed limit)

**Purpose:**
• Compensation for working on holidays
• Compensation for working on weekends
• Extra hours worked

**Rules:**
• Must be earned by working on holidays/weekends
• Requires prior approval from manager
• Must be used within 3 months of earning
• Cannot be carried forward beyond 3 months
• Cannot be encashed

**How to Earn:**
• Work on declared holidays
• Work on weekends (with approval)
• Extended work hours (as approved)

**How to Apply:**
• Submit request through HRMS or chatbot
• Mention the date you worked extra
• Manager approval required

💡 **Tip:** You can apply by saying "Apply for compensatory leave tomorrow"`,
    };

    const normalizedType = leaveType.charAt(0).toUpperCase() + leaveType.slice(1).toLowerCase();

    return (
      policies[normalizedType] ||
      `I don't have specific information about "${leaveType}" leave. Please ask about: Annual, Sick, Casual, Personal, WFH, or Compensatory leave.`
    );
  }
}

