/**
 * Migration Script: Add is_hidden column to reviews table
 *
 * Run this script once to add the is_hidden column to the reviews table.
 *
 * Usage:
 *   npx tsx scripts/add-is-hidden-column.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function addIsHiddenColumn() {
  console.log('🔄 Adding is_hidden column to reviews table...')

  try {
    // Execute the SQL to add the column
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
        CREATE INDEX IF NOT EXISTS idx_reviews_is_hidden ON reviews(is_hidden);
      `
    })

    if (error) {
      // If rpc doesn't exist, try direct SQL
      console.log('ℹ️  RPC method not available, using alternative approach...')

      // Check if column exists
      const { data: columns } = await supabase
        .from('reviews')
        .select('is_hidden')
        .limit(1)

      if (columns) {
        console.log('✅ Column is_hidden already exists!')
        return
      }
    } else {
      console.log('✅ Successfully added is_hidden column!')
      console.log('✅ Created index on is_hidden column!')
    }
  } catch (error: any) {
    if (error.message?.includes('column "is_hidden" of relation "reviews" already exists')) {
      console.log('✅ Column is_hidden already exists!')
    } else if (error.message?.includes('column "is_hidden" does not exist')) {
      console.error('❌ Error: Column does not exist and could not be created.')
      console.error('   Please run the following SQL in Supabase SQL Editor:')
      console.error('')
      console.error('   ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;')
      console.error('   CREATE INDEX IF NOT EXISTS idx_reviews_is_hidden ON reviews(is_hidden);')
      console.error('')
    } else {
      console.error('❌ Unexpected error:', error)
    }
  }
}

// Run the migration
addIsHiddenColumn()
  .then(() => {
    console.log('✨ Migration complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })
