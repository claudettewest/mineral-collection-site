document.addEventListener('DOMContentLoaded', () => {
    const mineralForm = new MineralForm();
    const mineralList = new MineralList();

    const landingPage = document.getElementById('landing-page');
    const addButton = document.getElementById('add-specimen-button');
    const viewEntriesButton = document.getElementById('view-entries-button');
    const formContainer = document.getElementById('form-container');
    const listContainer = document.getElementById('list-container');

    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.id = 'back-button';
    backButton.style.display = 'none';
    backButton.addEventListener('click', () => {
        landingPage.style.display = '';
        formContainer.style.display = 'none';
        listContainer.style.display = 'none';
        backButton.style.display = 'none';
    });

    document.body.insertBefore(backButton, document.querySelector('main'));

    formContainer.appendChild(mineralForm.render());
    listContainer.appendChild(mineralList.render());

    addButton.addEventListener('click', () => {
        landingPage.style.display = 'none';
        formContainer.style.display = '';
        listContainer.style.display = 'none';
        backButton.style.display = '';
    });

    viewEntriesButton.addEventListener('click', () => {
        landingPage.style.display = 'none';
        formContainer.style.display = 'none';
        listContainer.style.display = '';
        backButton.style.display = '';
    });

    mineralForm.onSubmit(async (mineral) => {
        try {
            const response = await fetch('/api/minerals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mineral),
            });

            if (!response.ok) {
                console.error('Failed to save mineral');
                return;
            }

            const savedMineral = await response.json();
            mineralList.addMineral(savedMineral);
            mineralForm.clear();
            landingPage.style.display = '';
            formContainer.style.display = 'none';
            listContainer.style.display = 'none';
            backButton.style.display = 'none';
        } catch (error) {
            console.error('Error saving mineral:', error);
        }
    });

    fetch('/api/minerals')
        .then((response) => response.json())
        .then((minerals) => mineralList.setMinerals(minerals))
        .catch((error) => console.error('Error loading minerals:', error));
});
