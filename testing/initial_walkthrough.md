# Walkthrough - Thorough Testing of Interview Tracker (Initial Run)

I have thoroughly tested the deployed application at https://interview-tracker-sepia.vercel.app/pipeline. The testing included account registration, login, and the execution of 10 diverse prompts to verify the system's understanding and responsiveness.

## Account Setup

I successfully registered a new user (`testuser_antigravity@example.com`) and logged in.

![Account Registration](./media/account_registration_1770497103287.webp)

## Prompt Testing Results

I executed 10 prompts covering various features. All prompts were correctly understood and acted upon by the system.

### Prompts 1-5: Application Management & Prep Setup
1. **Bulk Add**: `I applied to Google, Amazon, and Netflix for Senior SDE role.` -> Added 3 applications.
2. **Status Update**: `I just got shortlisted for Google!` -> Updated status to Shortlisted.
3. **NL Update**: `rejected from amazon after phone screen` -> Updated status to Rejected.
4. **Pipeline Summary**: `Show my pipeline summary` -> Rendered PipelineSummaryPanel.
5. **Sprint Setup**: `Set up prep for Google interview on March 15th` -> Rendered SprintSetupCard.

````carousel
![Google Prep Setup](./media/google_prep_setup_1770497379559.png)
<!-- slide -->
![Chat Test Results](./media/final_chat_test_results_1770497459913.png)
<!-- slide -->
![Testing 1-5 Recording](./media/prompt_testing_1_5highlighting_prompt_responses_and_ui_changes_1770497181278.webp)
````

### Prompts 6-10: Questions, Topics, Progress & Offers
6. **Add Question**: `Save this behavioral question: Tell me about a time you had a conflict with a teammate.` -> Triggered AddQuestionPanel.
7. **Mark Topic**: `I finished studying System Design today` -> Marked as complete.
8. **Daily Plan**: `What's on my agenda for today?` -> Showed TodaysPlanPanel.
9. **Log Offer**: `I got an offer from Netflix for 50 LPA with 10L bonus` -> Triggered OfferDetailsPanel.
10. **Progress**: `What is my current streak and progress?` -> Showed UserProgress (0-day streak).

![Testing 6-10 Recording](./media/prompt_testing_6_10highlighting_prompt_responses_and_ui_changes_1770497474098.webp)

## Final System State

The final state of the application reflects all changes made during testing.

````carousel
![Pipeline Board State](./media/pipeline_board_state_1770497709491.png)
<!-- slide -->
![Dashboard Overview](./media/dashboard_screenshot_1770497724993.png)
<!-- slide -->
![Chat History Progress](./media/chat_history_streak_progress_1770497768751.png)
````

## Conclusion
The system demonstrated excellent natural language understanding across all tested areas. It correctly handled bulk actions, status transitions, complex UI component triggers (Sprint Setup, Offer Details), and progress tracking. Typos and variations in phrasing were handled gracefully.
