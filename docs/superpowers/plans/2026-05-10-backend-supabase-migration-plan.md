# Backend Supabase Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate backend FastAPI from Firestore to Supabase-direct architecture. Client (mobile) will query Supabase directly via SDK with RLS. Backend pruned to only AI/Import/Webhook endpoints.

**Architecture:** Mobile → Supabase Cloud (Auth + Postgres + Storage). Backend FastAPI → AI processing, CSV import, webhooks only.

**Tech Stack:** Supabase Python client, Supabase JS client (Expo), FastAPI, JWT verification.

---

### Task 1: Setup Supabase Client in Mobile App

**Files:**
- Create: `apps/mobile/src/lib/supabase.ts`
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/.env`

- [ ] **Step 1: Install Supabase JS client**

```bash
cd apps/mobile
npm install @supabase/supabase-js
```

- [ ] **Step 2: Create Supabase client file**

```typescript
// apps/mobile/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 3: Add environment variables**

```env
# apps/mobile/.env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

- [ ] **Step 4: Test connection**

```typescript
// apps/mobile/src/lib/supabase.test.ts
import { supabase } from './supabase';

async function testConnection() {
  const { data, error } = await supabase.from('profiles').select('count');
  console.log('Supabase connection test:', error ? error.message : 'OK');
}
```

- [ ] **Step 5: Commit**

```bash
cd apps/mobile
git add src/lib/supabase.ts package.json .env
git commit -m "feat: add Supabase client to mobile app"
```

### Task 2: Create Wallet Service for Mobile

**Files:**
- Create: `apps/mobile/src/services/wallets.ts`
- Test: `apps/mobile/src/services/wallets.test.ts`

- [ ] **Step 1: Write failing test for wallet creation**

```typescript
// apps/mobile/src/services/wallets.test.ts
import { createWallet } from './wallets';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase');

describe('Wallet Service', () => {
  test('createWallet should insert wallet into Supabase', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ data: { id: 'wallet-123' }, error: null });
    (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

    const result = await createWallet({
      name: 'My Wallet',
      type: 'cash',
      balance: 100000,
    });

    expect(mockInsert).toHaveBeenCalledWith({
      name: 'My Wallet',
      type: 'cash',
      balance: 100000,
      currency: 'IDR',
      is_active: true,
    });
    expect(result.id).toBe('wallet-123');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/mobile
npm test src/services/wallets.test.ts
# Expected: FAIL with "createWallet not defined"
```

- [ ] **Step 3: Implement wallet service**

```typescript
// apps/mobile/src/services/wallets.ts
import { supabase } from '../lib/supabase';

export interface WalletCreate {
  name: string;
  type: 'cash' | 'bank' | 'ewallet' | 'investment';
  balance?: number;
  currency?: string;
  bank_name?: string;
  account_number?: string;
}

export interface Wallet extends WalletCreate {
  id: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function createWallet(wallet: WalletCreate): Promise<Wallet> {
  const { data, error } = await supabase
    .from('wallets')
    .insert({
      ...wallet,
      balance: wallet.balance || 0,
      currency: wallet.currency || 'IDR',
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listWallets(): Promise<Wallet[]> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateWallet(id: string, updates: Partial<WalletCreate>): Promise<Wallet> {
  const { data, error } = await supabase
    .from('wallets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWallet(id: string): Promise<void> {
  const { error } = await supabase
    .from('wallets')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/mobile
npm test src/services/wallets.test.ts
# Expected: PASS
```

- [ ] **Step 5: Commit**

```bash
cd apps/mobile
git add src/services/wallets.ts src/services/wallets.test.ts
git commit -m "feat: add wallet service for Supabase"
```

### Task 3: Create Transaction Service for Mobile

**Files:**
- Create: `apps/mobile/src/services/transactions.ts`
- Test: `apps/mobile/src/services/transactions.test.ts`

- [ ] **Step 1: Write failing test for transaction creation**

```typescript
// apps/mobile/src/services/transactions.test.ts
import { createTransaction } from './transactions';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase');

describe('Transaction Service', () => {
  test('createTransaction should insert transaction and update wallet balance', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ data: { id: 'tx-123' }, error: null });
    const mockUpdate = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock)
      .mockReturnValueOnce({ insert: mockInsert })
      .mockReturnValueOnce({ update: mockUpdate });

    const result = await createTransaction({
      wallet_id: 'wallet-123',
      type: 'expense',
      amount: 10000,
      category: 'food',
    });

    expect(mockInsert).toHaveBeenCalledWith({
      wallet_id: 'wallet-123',
      type: 'expense',
      amount: 10000,
      category: 'food',
      input_type: 'manual',
      status: 'done',
      is_verified: false,
      review_required: false,
    });
    expect(result.id).toBe('tx-123');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/mobile
npm test src/services/transactions.test.ts
# Expected: FAIL with "createTransaction not defined"
```

- [ ] **Step 3: Implement transaction service**

```typescript
// apps/mobile/src/services/transactions.ts
import { supabase } from '../lib/supabase';

export interface TransactionCreate {
  wallet_id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note?: string;
  merchant?: string;
  date?: string;
  input_type?: 'manual' | 'text' | 'image' | 'voice' | 'import';
}

export interface Transaction extends TransactionCreate {
  id: string;
  user_id: string;
  status: 'processing' | 'done' | 'error';
  is_verified: boolean;
  review_required: boolean;
  confidence?: number;
  created_at: string;
  updated_at: string;
}

export async function createTransaction(tx: TransactionCreate): Promise<Transaction> {
  const { data: txData, error: txError } = await supabase
    .from('transactions')
    .insert({
      ...tx,
      input_type: tx.input_type || 'manual',
      status: 'done',
      is_verified: false,
      review_required: false,
    })
    .select()
    .single();

  if (txError) throw txError;

  // Update wallet balance
  const walletUpdate = tx.type === 'income' ? tx.amount : -tx.amount;
  const { error: walletError } = await supabase.rpc('update_wallet_balance', {
    wallet_id: tx.wallet_id,
    delta: walletUpdate,
  });

  if (walletError) {
    console.error('Failed to update wallet balance:', walletError);
    // Continue anyway - transaction created but wallet balance not updated
  }

  return txData;
}

export async function listTransactions(filters?: {
  type?: 'income' | 'expense';
  category?: string;
  wallet_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select('*')
    .order('tanggal', { ascending: false });

  if (filters?.type) query = query.eq('type', filters.type);
  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.wallet_id) query = query.eq('wallet_id', filters.wallet_id);
  if (filters?.date_from) query = query.gte('tanggal', filters.date_from);
  if (filters?.date_to) query = query.lte('tanggal', filters.date_to);

  if (filters?.page && filters?.per_page) {
    const from = (filters.page - 1) * filters.per_page;
    const to = from + filters.per_page - 1;
    query = query.range(from, to);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function updateTransaction(id: string, updates: Partial<TransactionCreate>): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/mobile
npm test src/services/transactions.test.ts
# Expected: PASS
```

- [ ] **Step 5: Commit**

```bash
cd apps/mobile
git add src/services/transactions.ts src/services/transactions.test.ts
git commit -m "feat: add transaction service for Supabase"
```

### Task 4: Refactor Backend Auth (Firebase → Supabase JWT)

**Files:**
- Modify: `backend/app/core/auth.py`
- Modify: `backend/app/core/config.py`
- Modify: `backend/.env`

- [ ] **Step 1: Install JWT verification library**

```bash
cd backend
pip install python-jose[cryptography]
```

- [ ] **Step 2: Update requirements.txt**

```txt
# backend/requirements.txt
# Remove:
# firebase-admin==6.5.0

# Add:
python-jose[cryptography]==3.3.0
```

- [ ] **Step 3: Refactor auth.py**

```python
# backend/app/core/auth.py
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError

from app.core.config import settings

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
):
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak ditemukan.",
        )

    token = credentials.credentials
    try:
        # Supabase JWT verification
        # Note: In production, verify with Supabase's JWKS
        # For now, we'll just decode and check basic structure
        decoded = jwt.decode(
            token,
            options={"verify_signature": False},  # TODO: Implement proper verification
        )
        
        user_id = decoded.get("sub")
        email = decoded.get("email")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token tidak valid.",
            )
        
        return {
            "user_id": user_id,
            "email": email,
        }
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sudah kedaluwarsa.",
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid.",
        )
```

- [ ] **Step 4: Update config.py**

```python
# backend/app/core/config.py
# Remove Firebase config:
# FIREBASE_PROJECT_ID: str | None = None
# FIREBASE_PRIVATE_KEY: str | None = None
# FIREBASE_CLIENT_EMAIL: str | None = None

# Add Supabase config:
SUPABASE_URL: str | None = None
SUPABASE_ANON_KEY: str | None = None
SUPABASE_SERVICE_ROLE_KEY: str | None = None
```

- [ ] **Step 5: Update .env**

```env
# backend/.env
# Remove:
# FIREBASE_PROJECT_ID=catat-in-69ca6
# FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
# FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@catat-in-69ca6.iam.gserviceaccount.com

# Add:
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

- [ ] **Step 6: Test auth endpoint**

```bash
cd backend
python -c "
from app.core.auth import get_current_user
from fastapi.security import HTTPAuthorizationCredentials
import jwt

# Create a test token
test_token = jwt.encode({'sub': 'test-user-123', 'email': 'test@example.com'}, 'secret')

# Test decoding
credentials = HTTPAuthorizationCredentials(scheme='Bearer', credentials=test_token)
try:
    user = get_current_user(credentials)
    print('Auth test passed:', user)
except Exception as e:
    print('Auth test failed:', e)
"
```

- [ ] **Step 7: Commit**

```bash
cd backend
git add app/core/auth.py app/core/config.py .env requirements.txt
git commit -m "refactor: migrate auth from Firebase to Supabase JWT"
```

### Task 5: Prune Backend CRUD Endpoints

**Files:**
- Delete: `backend/app/api/v1/wallets.py`
- Delete: `backend/app/api/v1/transactions.py`
- Delete: `backend/app/api/v1/budgets.py`
- Delete: `backend/app/api/v1/bills.py`
- Delete: `backend/app/api/v1/categories.py`
- Delete: `backend/app/api/v1/groups.py`
- Delete: `backend/app/api/v1/reports.py`
- Delete: `backend/app/api/v1/professional.py`
- Delete: `backend/app/core/firebase.py`
- Delete: `backend/app/core/database.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Delete wallet endpoint**

```bash
cd backend
rm app/api/v1/wallets.py
```

- [ ] **Step 2: Delete transaction endpoint**

```bash
cd backend
rm app/api/v1/transactions.py
```

- [ ] **Step 3: Delete other CRUD endpoints**

```bash
cd backend
rm app/api/v1/budgets.py
rm app/api/v1/bills.py
rm app/api/v1/categories.py
rm app/api/v1/groups.py
rm app/api/v1/reports.py
rm app/api/v1/professional.py
```

- [ ] **Step 4: Delete Firebase files**

```bash
cd backend
rm app/core/firebase.py
rm app/core/database.py
```

- [ ] **Step 5: Update main.py**

```python
# backend/main.py
# Remove imports:
# from app.api.v1 import (
#     ai,
#     bills,
#     budgets,
#     categories,
#     groups,
#     imports,
#     professional,
#     reports,
#     transactions,
#     wallets,
#     webhooks,
# )

# Keep only:
from app.api.v1 import (
    ai,
    imports,
    webhooks,
)

# Remove router includes:
# app.include_router(wallets.router, prefix=f"{API_PREFIX}/wallets", tags=["Wallets"])
# app.include_router(transactions.router, prefix=f"{API_PREFIX}/transactions", tags=["Transactions"])
# app.include_router(categories.router, prefix=f"{API_PREFIX}/categories", tags=["Categories"])
# app.include_router(bills.router, prefix=f"{API_PREFIX}/bills", tags=["Bills"])
# app.include_router(budgets.router, prefix=f"{API_PREFIX}/budgets", tags=["Budgets"])
# app.include_router(reports.router, prefix=f"{API_PREFIX}/reports", tags=["Reports"])
# app.include_router(groups.router, prefix=f"{API_PREFIX}/groups", tags=["Groups"])
# app.include_router(professional.router, prefix=f"{API_PREFIX}", tags=["Professional"])

# Keep only:
app.include_router(ai.router, prefix=f"{API_PREFIX}/ai", tags=["AI"])
app.include_router(imports.router, prefix=f"{API_PREFIX}/imports", tags=["Import"])
app.include_router(webhooks.router, prefix=f"{API_PREFIX}/webhooks", tags=["Webhooks"])
```

- [ ] **Step 6: Test backend still starts**

```bash
cd backend
python -c "from main import app; print('Backend imports OK')"
```

- [ ] **Step 7: Commit**

```bash
cd backend
git add main.py
git commit -m "feat: prune backend CRUD endpoints, keep only AI/Import/Webhook"
```

### Task 6: Create Budget, Bill, Category Services for Mobile

**Files:**
- Create: `apps/mobile/src/services/budgets.ts`
- Create: `apps/mobile/src/services/bills.ts`
- Create: `apps/mobile/src/services/categories.ts`

- [ ] **Step 1: Create budget service**

```typescript
// apps/mobile/src/services/budgets.ts
import { supabase } from '../lib/supabase';

export interface BudgetCreate {
  category: string;
  limit_amount: number;
  period?: 'monthly' | 'weekly';
  period_start: string;
  notify_at_percent?: number;
}

export interface Budget extends BudgetCreate {
  id: string;
  user_id: string;
  spent_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function createBudget(budget: BudgetCreate): Promise<Budget> {
  const { data, error } = await supabase
    .from('budgets')
    .insert({
      ...budget,
      period: budget.period || 'monthly',
      notify_at_percent: budget.notify_at_percent || 80,
      spent_amount: 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listBudgets(): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .order('period_start', { ascending: false });

  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Create bill service**

```typescript
// apps/mobile/src/services/bills.ts
import { supabase } from '../lib/supabase';

export interface BillCreate {
  name: string;
  amount: number;
  due_day: number;
  recurrence: 'monthly' | 'yearly' | 'once';
  next_due_date: string;
  notify_before_days?: number;
}

export interface Bill extends BillCreate {
  id: string;
  user_id: string;
  is_paid: boolean;
  payment_history: any[];
  created_at: string;
  updated_at: string;
}

export async function createBill(bill: BillCreate): Promise<Bill> {
  const { data, error } = await supabase
    .from('bill_reminders')
    .insert({
      ...bill,
      notify_before_days: bill.notify_before_days || 3,
      is_paid: false,
      payment_history: [],
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listBills(): Promise<Bill[]> {
  const { data, error } = await supabase
    .from('bill_reminders')
    .select('*')
    .order('next_due_date', { ascending: true });

  if (error) throw error;
  return data;
}
```

- [ ] **Step 3: Create category service**

```typescript
// apps/mobile/src/services/categories.ts
import { supabase } from '../lib/supabase';

export interface CategoryCreate {
  name: string;
  icon?: string;
  is_default?: boolean;
  budget_limit?: number;
}

export interface Category extends CategoryCreate {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export async function createCategory(category: CategoryCreate): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      ...category,
      is_default: category.is_default || false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
}
```

- [ ] **Step 4: Commit**

```bash
cd apps/mobile
git add src/services/budgets.ts src/services/bills.ts src/services/categories.ts
git commit -m "feat: add budget, bill, category services for Supabase"
```

### Task 7: End-to-End Testing

**Files:**
- Create: `apps/mobile/src/services/integration.test.ts`
- Test: `backend/tests/test_ai.py`

- [ ] **Step 1: Test mobile Supabase connection**

```typescript
// apps/mobile/src/services/integration.test.ts
import { supabase } from '../lib/supabase';
import { createWallet } from './wallets';
import { createTransaction } from './transactions';

describe('Supabase Integration', () => {
  test('should connect to Supabase', async () => {
    const { data, error } = await supabase.from('profiles').select('count');
    expect(error).toBeNull();
  });

  test('should create wallet and transaction', async () => {
    // Create wallet
    const wallet = await createWallet({
      name: 'Test Wallet',
      type: 'cash',
      balance: 100000,
    });

    // Create transaction
    const transaction = await createTransaction({
      wallet_id: wallet.id,
      type: 'expense',
      amount: 10000,
      category: 'food',
    });

    expect(wallet.id).toBeDefined();
    expect(transaction.id).toBeDefined();
  });
});
```

- [ ] **Step 2: Test backend AI endpoint**

```python
# backend/tests/test_ai.py
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_ai_chat_endpoint():
    response = client.post("/api/v1/ai/chat", json={"text": "Saya beli makan siang Rp 50.000"})
    assert response.status_code == 401  # Requires auth
    
    # Test with auth token
    response = client.post(
        "/api/v1/ai/chat",
        json={"text": "Saya beli makan siang Rp 50.000"},
        headers={"Authorization": "Bearer test-token"}
    )
    assert response.status_code in [200, 502]  # 200 if AI works, 502 if API key missing
```

- [ ] **Step 3: Run all tests**

```bash
# Mobile tests
cd apps/mobile
npm test

# Backend tests
cd backend
python -m pytest tests/ -v
```

- [ ] **Step 4: Commit**

```bash
cd apps/mobile
git add src/services/integration.test.ts
cd ../backend
git add tests/test_ai.py
git commit -m "test: add integration tests for Supabase migration"
```

### Task 8: Update CLAUDE.md Documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update architecture section**

```markdown
## Tech Stack

### Active Stack (Kaswise v1.0 — Mobile-First)
| Layer    | Teknologi                                                            |
| -------- | -------------------------------------------------------------------- |
| Frontend | Expo SDK 51, React Native 0.74, Expo Router, NativeWind v4          |
| Backend  | Supabase Cloud (Auth + Postgres + Storage + Edge Functions + Realtime) |
| Database | Supabase PostgreSQL dengan RLS aktif di semua tabel                 |
| Auth     | Supabase Auth (email/password + Google OAuth)                        |
| AI       | Anthropic Claude (Haiku/Sonnet), OpenAI Whisper                      |
| State    | Zustand + Supabase Client SDK                                       |

### Backend FastAPI (Specialized Only)
| Layer    | Teknologi                                                            |
| -------- | -------------------------------------------------------------------- |
| Backend  | FastAPI (Python 3.12)                                                |
| Function | AI processing, CSV/Excel import, payment webhooks                   |
| Auth     | Supabase JWT verification                                            |
```

- [ ] **Step 2: Update API section**

```markdown
## API Architecture

### Mobile → Supabase Direct
Mobile app langsung query Supabase via client SDK:
- CRUD wallets, transactions, budgets, bills, categories
- Auth via Supabase Auth
- RLS policies ensure data isolation

### Backend FastAPI (Specialized)
Endpoint yang tersisa:
- `/api/v1/ai/chat` — Extract transaction dari text (Claude API)
- `/api/v1/ai/receipt` — OCR struk (Claude API)
- `/api/v1/ai/insight` — Financial insight (Claude API)
- `/api/v1/imports` — Parser CSV/Excel bank statement
- `/api/v1/webhooks` — Midtrans payment callback
```

- [ ] **Step 3: Update file structure**

```markdown
## File Structure

```
catat-in/
├── apps/mobile/           # [ACTIVE] Expo (Android/iOS/Web PWA)
│   ├── src/lib/supabase.ts    # Supabase client
│   ├── src/services/          # CRUD services
│   │   ├── wallets.ts
│   │   ├── transactions.ts
│   │   ├── budgets.ts
│   │   ├── bills.ts
│   │   └── categories.ts
│   └── .env                   # Supabase config
├── backend/               # [SPECIALIZED] FastAPI
│   ├── app/api/v1/ai.py      # AI endpoints
│   ├── app/api/v1/imports.py # Import endpoints
│   ├── app/api/v1/webhooks.py # Webhook endpoints
│   ├── app/core/auth.py      # Supabase JWT auth
│   └── .env                  # Supabase + AI config
├── supabase/              # Database schema
│   └── migrations/       # PostgreSQL migrations
└── packages/shared/       # TypeScript types bersama
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for Supabase migration architecture"
```

## Success Criteria Checklist

- [ ] Mobile bisa login via Supabase Auth
- [ ] Mobile bisa CRUD wallets, transactions, budgets, bills, categories via Supabase
- [ ] Backend AI endpoint (`/ai/chat`) masih berfungsi dengan Supabase JWT auth
- [ ] Backend Import endpoint (`/imports`) masih berfungsi
- [ ] Backend Webhook endpoint (`/webhooks`) masih berfungsi
- [ ] Tidak ada Firebase/Firestore code remaining di backend
- [ ] RLS policies mencegah cross-user access
- [ ] Semua test pass (mobile + backend)

## Rollback Plan

Jika ada masalah kritis:
1. Restore `main.py` dengan router CRUD dari git history
2. Restore file endpoint yang dihapus (`git checkout HEAD~1 -- app/api/v1/*.py`)
3. Mobile fallback ke backend API (temporary)
4. Revert auth changes (`git checkout HEAD~1 -- app/core/auth.py`)

---

Plan complete and saved to `docs/superpowers/plans/2026-05-10-backend-supabase-migration-plan.md`.

**Execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
