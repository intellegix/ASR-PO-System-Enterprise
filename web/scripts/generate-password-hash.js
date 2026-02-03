const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'Devops$@2026';
  const saltRounds = 12;

  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Password:', password);
    console.log('Bcrypt Hash:', hash);
    console.log('');
    console.log('SQL UPDATE for create-admin-user.sql:');
    console.log(`'${hash}'`);

    // Test the hash
    const isValid = await bcrypt.compare(password, hash);
    console.log('');
    console.log('Hash validation test:', isValid ? '✅ VALID' : '❌ INVALID');

  } catch (error) {
    console.error('Error generating hash:', error);
  }
}

generateHash();