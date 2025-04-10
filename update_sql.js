const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

// Get Supabase URL and anon key from environment
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    // Read the SQL file
    const sqlPath = './app/db/fix_task_conversations.sql';
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing SQL to fix the get_user_task_conversations function...');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('Error executing SQL:', error);
      process.exit(1);
    }
    
    console.log('SQL executed successfully!');
    console.log('The get_user_task_conversations function has been updated.');
    
  } catch (err) {
    console.error('Failed to execute SQL:', err);
    process.exit(1);
  }
}

main(); 