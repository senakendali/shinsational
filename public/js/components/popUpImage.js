let modalInstance = null;

export function showImageModal(imageUrl) {
    const container = document.getElementById("popUpImage");
    if (!container) {
        console.error("Popup container not found");
        return;
    }

    container.innerHTML = `
<div class="modal fade" id="popUpImageModal" tabindex="-1" aria-hidden="true" style="background-color: rgba(212, 203, 203, 0.32);">
    <div class="modal-dialog modal-dialog-centered mw-100 mx-2" style="max-width: 90%;">
        <div class="modal-content border-0 bg-transparent">
            <div class="border-0 mb-2 d-flex justify-content-start" style="padding-left: 100px;">
                <button type="button" class="btn-close btn-white" data-bs-dismiss="modal" aria-label="Close" 
                    style="filter: brightness(0) invert(1); transform: scale(1.5); margin: 0.5rem; opacity: 1;">
                </button>
            </div>
            <div class="modal-body p-0 d-flex justify-content-center align-items-center" style="min-height: 60vh;">
                <div class="d-flex justify-content-center align-items-center" style="width: 100%; height: 100%;">
                    <img id="modalImage" 
                         src="${imageUrl}" 
                         alt="Preview" 
                         class="img-fluid" 
                         style="max-height: 80vh; max-width: 100%; object-fit: contain; display: block;">
                </div>
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
