const http = require('http');
const req = http.request('http://localhost:5000/api/admin-auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const token = JSON.parse(data).token;
    if (!token) {
      console.log('Login failed:', data);
      return;
    }
    const dlReq = http.request('http://localhost:5000/api/admin/users/download/excel', {
      headers: { 'Authorization': 'Bearer ' + token }
    }, (dlRes) => {
      console.log('Download Status:', dlRes.statusCode);
      let errorData = '';
      dlRes.on('data', chunk => errorData += chunk);
      dlRes.on('end', () => console.log('Download Response:', errorData.substring(0, 500)));
    });
    dlReq.end();
  });
});
req.write(JSON.stringify({ email: 'meetpatel27@gmail.com', password: 'meet' })); // Using a documented admin from previous context or a common default if available. Waiting to see the error. We can use a find query via mongo directly instead if needed.
req.end();
