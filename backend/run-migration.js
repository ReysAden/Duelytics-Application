const { query, connectDatabase, closeDatabase } = require('./config/database');

async function runMigration() {
  try {
    console.log('🔧 Starting database migration...');
    
    // Connect to database
    await connectDatabase();
    
    // Fix points_change column in duels table
    console.log('📝 Fixing duels.points_change column...');
    await query('ALTER TABLE duels ALTER COLUMN points_change TYPE NUMERIC(10,2)');
    console.log('✅ Fixed duels.points_change to NUMERIC(10,2)');
    
    // Fix current_points column in player_session_stats table
    console.log('📝 Fixing player_session_stats.current_points column...');
    await query('ALTER TABLE player_session_stats ALTER COLUMN current_points TYPE NUMERIC(10,2)');
    console.log('✅ Fixed player_session_stats.current_points to NUMERIC(10,2)');
    
    // Verify the changes
    console.log('🔍 Verifying column types...');
    const duelsCols = await query(`
      SELECT column_name, data_type, numeric_precision, numeric_scale 
      FROM information_schema.columns 
      WHERE table_name = 'duels' AND column_name = 'points_change'
    `);
    
    const statsCols = await query(`
      SELECT column_name, data_type, numeric_precision, numeric_scale 
      FROM information_schema.columns 
      WHERE table_name = 'player_session_stats' AND column_name = 'current_points'
    `);
    
    console.log('📊 Duels points_change:', duelsCols.rows[0]);
    console.log('📊 Stats current_points:', statsCols.rows[0]);
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}

runMigration();