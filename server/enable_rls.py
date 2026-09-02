import sys
from sqlalchemy import text
from app.database import engine

def check_and_enable_rls():
    with engine.connect() as conn:
        print("Checking tables in 'public' schema...")
        result = conn.execute(text("""
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename;
        """))
        
        tables = result.fetchall()
        print(f"Found {len(tables)} tables in 'public' schema:")
        for t, rls in tables:
            print(f" - {t}: RLS enabled = {rls}")
            
        print("\nEnabling Row Level Security (RLS) on all public tables...")
        for t, rls in tables:
            if not rls:
                print(f"Enabling RLS on {t}...")
                conn.execute(text(f'ALTER TABLE public."{t}" ENABLE ROW LEVEL SECURITY;'))
            else:
                print(f"Table {t} already has RLS enabled.")
                
        conn.commit()
        
        print("\nVerifying updated RLS status:")
        res_verify = conn.execute(text("""
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename;
        """))
        for t, rls in res_verify.fetchall():
            print(f" - {t}: RLS enabled = {rls}")

    print("\nAll public tables secured with RLS!")

if __name__ == "__main__":
    check_and_enable_rls()
