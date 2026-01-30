const run = async () => {
    try {
        console.log('Fetching profiles from http://localhost:3011/api/perfis...');
        const res = await fetch('http://localhost:3011/api/perfis');

        if (!res.ok) {
            console.error(`Error: ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.error('Body:', text);
            return;
        }

        const data = await res.json();
        console.log('Success! Profiles loaded:', data);

    } catch (e) {
        console.error('Fetch error:', e);
    }
};

run();
