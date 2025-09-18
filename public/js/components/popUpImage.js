let modalInstance = null;

export function showImageModal(imageUrl) {
    const container = document.getElementById("popUpImage");
    if (!container) {
        console.error("Popup container not found");
        return;
    }

    container.innerHTML = `
    <div class="modal fade" id="popUpImageModal" tabindex="-1" aria-hidden="true" style="background-color: rgba(107, 104, 104, 0.32);">
    <div class="modal-dialog modal-dialog-centered mw-100 mx-2" style="max-width: 90%;">
        <div class="modal-content border-0 bg-transparent">
            <div class="d-flex flex-column align-items-center">
                <div class="w-100 d-flex justify-content-center" style="max-height: 80vh;">
                    <img id="modalImage" 
                         src="${imageUrl}" 
                         alt="Preview" 
                         class="img-fluid" 
                         style="max-height: 100%; max-width: 100%; object-fit: contain; display: block;">
                </div>
                <div class="mt-3">
                    <button type="button" 
                            class="btn btn-sm btn-outline-light" 
                            data-bs-dismiss="modal" 
                            aria-label="Close"
                            style="padding: 0.5rem 1rem;">
                        Close
                    </button>
                </div>
            </div>
        </div>
    </div>`;

    // Initialize and show the modal
    const modalEl = document.getElementById("popUpImageModal");
    if (modalEl) {
        // Dispose of previous modal if it exists
        if (modalInstance) {
            modalInstance.dispose();
        }

        modalInstance = new bootstrap.Modal(modalEl);
        modalInstance.show();
    }
}
