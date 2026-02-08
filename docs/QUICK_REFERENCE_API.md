# 🚀 Quick Reference: API Integration

## 📋 What Changed?

### Before
- Data was hardcoded in Zustand store
- No backend synchronization
- Demo data only

### After
- Data fetched from PostgreSQL via API
- Automatic sync on login
- Real data persistence

---

## 🔧 New API Methods

### Load Data
```typescript
const loadApps = useStore(s => s.loadApplicationsFromAPI);
const loadSprints = useStore(s => s.loadSprintsFromAPI);
const loadQuestions = useStore(s => s.loadQuestionsFromAPI);

await loadApps();
await loadSprints();
await loadQuestions();
```

### Create Data
```typescript
const createApp = useStore(s => s.createApplicationAPI);
const createSprint = useStore(s => s.createSprintAPI);
const createQuestion = useStore(s => s.createQuestionAPI);

const app = await createApp({
  company: 'Google',
  role: 'SDE',
  status: 'applied'
});
```

### Update Data
```typescript
const updateApp = useStore(s => s.updateApplicationAPI);

await updateApp('app-id', {
  status: 'interview',
  interviewDate: '2026-03-01'
});
```

### Delete Data
```typescript
const deleteApp = useStore(s => s.deleteApplicationAPI);

await deleteApp('app-id');
```

### Sync All Data
```typescript
const sync = useStore(s => s.syncWithBackend);

await sync(); // Fetches everything
```

---

## 🎯 Key Files

| File | Purpose |
|------|---------|
| `src/lib/store.ts` | API methods added here |
| `src/hooks/useDataSync.ts` | Auto-sync hook |
| `src/components/providers/DataSyncProvider.tsx` | Provider wrapper |
| `src/app/layout.tsx` | DataSyncProvider added |

---

## ✅ How to Test

1. **Start backend**: `npm run dev`
2. **Login**: Go to `/auth`
3. **Check console**: Should see data loading
4. **Create app**: Use Pipeline page
5. **Refresh page**: Data should persist

---

## 🐛 Troubleshooting

### No data loading?
- Check backend is running
- Check you're logged in
- Check browser console for errors

### API errors?
- Verify `DATABASE_URL` in `.env.local`
- Check `JWT_SECRET` matches backend
- Check network tab in DevTools

### Build errors?
- Run: `npm install`
- Clear `.next`: `Remove-Item .next -Recurse -Force`
- Rebuild: `npm run build`

---

## 📚 Documentation

- **Full Guide**: `API_DATA_SYNC_GUIDE.md`
- **Summary**: `API_INTEGRATION_SUMMARY.md`
- **API Map**: `API_MAP.md`

---

## 🎉 You're All Set!

Your app now uses real backend data. All existing UI components work as before, but with real data from PostgreSQL!
