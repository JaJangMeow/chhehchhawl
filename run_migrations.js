const { exec } = require('child_process');
const path = require('path');

console.log('Running database migrations...');
console.log('This will update the conversation table schema and add required functionality.');

// Function to execute a command and return a promise
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
      }
      
      console.log(`Output: ${stdout}`);
      resolve(stdout);
    });
  });
}

// Run the migration script
async function runMigrations() {
  try {
    // Path to our migration execution script
    const migrationScript = path.join(__dirname, 'app', 'db', 'execute_migration.js');
    
    // Execute the migration
    await executeCommand(`node ${migrationScript}`);
    
    console.log('Migration completed successfully!');
    console.log('The conversation schema has been updated with the following changes:');
    console.log('1. Added "category" column to conversations table');
    console.log('2. Updated get_user_task_conversations function to include category');
    console.log('3. Categorized existing conversations based on task relationships');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migrations
runMigrations()
  .then(() => {
    console.log('All database updates completed successfully.');
  })
  .catch(err => {
    console.error('Fatal error in migration process:', err);
    process.exit(1);
  }); 