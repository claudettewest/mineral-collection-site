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
        mineralForm.clear();
        showLanding();
    });

    document.body.insertBefore(backButton, document.querySelector('main'));

    formContainer.appendChild(mineralForm.render());
    listContainer.appendChild(mineralList.render());

    addButton.addEventListener('click', () => {
        mineralForm.clear();
        showForm();
    });

    viewEntriesButton.addEventListener('click', () => {
        showList();
    });

    function showLanding() {
        landingPage.style.display = '';
        formContainer.style.display = 'none';
        listContainer.style.display = 'none';
        backButton.style.display = 'none';
    }

    function showForm() {
        landingPage.style.display = 'none';
        formContainer.style.display = '';
        listContainer.style.display = 'none';
        backButton.style.display = '';
    }

    function showList() {
        landingPage.style.display = 'none';
        formContainer.style.display = 'none';
        listContainer.style.display = '';
        backButton.style.display = '';
    }

    mineralForm.onSubmit(async (mineral) => {
        try {
            const isEdit = Boolean(mineral.id);
            const response = await fetch(isEdit ? `/api/minerals/${mineral.id}` : '/api/minerals', {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mineral),
            });

            if (!response.ok) {
                console.error('Failed to save mineral');
                return;
            }

            const savedMineral = await response.json();
            if (isEdit) {
                mineralList.updateMineral(savedMineral);
            } else {
                mineralList.addMineral(savedMineral);
            }
            mineralForm.clear();
            showList();
        } catch (error) {
            console.error('Error saving mineral:', error);
        }
    });

    mineralList.onEdit((mineral) => {
        mineralForm.edit(mineral);
        showForm();
    });

    mineralList.onDelete(async (mineral) => {
        if (!confirm(`Delete ${mineral.name}?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/minerals/${mineral.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                console.error('Failed to delete mineral');
                return;
            }

            mineralList.removeMineral(mineral.id);
        } catch (error) {
            console.error('Error deleting mineral:', error);
        }
    });

    fetch('/api/minerals')
        .then((response) => response.json())
        .then((minerals) => mineralList.setMinerals(minerals))
        .catch((error) => console.error('Error loading minerals:', error));
});
