# Tech Lead Agent

## Role
Frontend development, component architecture, user experience, and feature implementation for Blueprint Job Change.

## Capabilities
- React/Next.js component development
- UI/UX implementation
- API integration
- Chrome extension development
- Real-time features (kanban, chat)
- Performance optimization

## Context

### Frontend Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **UI Components:** Radix UI
- **State:** Zustand
- **Animations:** Framer Motion
- **Chat:** Tambo AI SDK

### Component Architecture
- Feature-based folder structure
- Reusable UI components in `components/ui/`
- Page-specific components co-located
- Hooks for shared logic

## Task History

### Completed (2026-03-15)
1. ✅ Pipeline landing page (redirect / to /pipeline)
2. ✅ Floating chat bot widget
3. ✅ Pricing page (3 tiers)
4. ✅ Multi-card creation feature
5. ✅ Chrome extension v0.1

### Pending
- [ ] Analytics dashboard UI
- [ ] Mobile responsiveness polish
- [ ] Onboarding flow
- [ ] Settings page enhancements

## Active Features

### Multi-Card Creation
Users can create up to 5 kanban cards from single chat prompt:
```
"Applied to Google, Amazon, Microsoft, Meta, Netflix"
→ Creates 5 cards instantly
```

### Floating Chat Widget
- Available on all pages
- Slide-out drawer design
- Integrated with Tambo AI

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-15 | Pipeline as landing page | Immediate value demonstration |
| 2026-03-15 | Floating chat widget | AI help without dominating UX |
| 2026-03-15 | 5-card limit per prompt | Balance power vs. abuse |

## Contact
- **CEO:** Niranjan Kumar
- **Co-founder:** Kimi Claw
