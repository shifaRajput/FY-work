// 1. GLOBAL SCOPE: Accessible by HTML 'onclick'
let removedFiles = [];

function goBack() {
    window.history.back();
}

function removeFromServer(filename, elementId, type) {
    if (confirm("Remove this file from the gallery?")) {
        removedFiles.push(filename);
        const input = document.getElementById('removedFilesInput');
        if (input) input.value = JSON.stringify(removedFiles);
        
        const element = document.getElementById(elementId);
        if (element) element.remove();

        // If Edit Mode variables exist, decrement them
        if (type === 'image' && typeof window.existingImageCount !== 'undefined') window.existingImageCount--;
        if (type === 'video' && typeof window.existingVideoCount !== 'undefined') window.existingVideoCount--;
    }
}

// 2. MAIN LOGIC
document.addEventListener("DOMContentLoaded", function() {
    const mediaInput = document.getElementById("mediaInput");
    const previewGrid = document.getElementById("previewGrid");
    const form = document.getElementById("productForm");
    
    // Price Fields
    const real_price = document.getElementById("real_price");
    const old_price = document.getElementById("old_price");
    const saveAmount = document.getElementById("saveAmount");
    const priceError = document.getElementById("priceError");

    if (!mediaInput || !previewGrid || !form) return;

    let mediaFiles = []; // Array for NEW uploads

    // Helper: Gets the TOTAL count (Server-side + New selections)
    function getTotalCounts() {
        const newImgCount = mediaFiles.filter(f => f.type.startsWith("image/")).length;
        const newVidCount = mediaFiles.filter(f => f.type.startsWith("video/")).length;
        
        // Use window variables if they exist (Edit Mode), otherwise 0 (Add Mode)
        const serverImg = (typeof window.existingImageCount !== 'undefined') ? window.existingImageCount : 0;
        const serverVid = (typeof window.existingVideoCount !== 'undefined') ? window.existingVideoCount : 0;
        
        return {
            images: serverImg + newImgCount,
            videos: serverVid + newVidCount
        };
    }

    // --- PRICE CALCULATION ---
    function calculateSave() {
        const real = parseFloat(real_price.value);
        const old = parseFloat(old_price.value);
        if (isNaN(real) || isNaN(old)) {
            saveAmount.value = "";
            if (priceError) priceError.textContent = "";
            return;
        }
        if (old > real) {
            if (priceError) priceError.textContent = "";
            saveAmount.value = "₹ " + (old - real);
        } else {
            if (priceError) priceError.textContent = "Old price must be greater than real price";
            saveAmount.value = "";
        }
    }

    if (real_price && old_price) {
        real_price.addEventListener("input", calculateSave);
        old_price.addEventListener("input", calculateSave);
    }

    // --- MEDIA UPLOAD ---
    mediaInput.addEventListener("change", function() {
        const selectedFiles = Array.from(this.files);

        selectedFiles.forEach(file => {
            const isImage = file.type.startsWith("image/");
            const isVideo = file.type.startsWith("video/");
            const counts = getTotalCounts();

            if (isImage) {
                if (counts.images >= 5) {
                    alert("Maximum 5 images allowed");
                    return;
                }
            } else if (isVideo) {
                if (counts.videos >= 2) {
                    alert("Maximum 2 videos allowed");
                    return;
                }
            }

            // If checks pass, add to array and preview
            mediaFiles.push(file);
            const div = document.createElement("div");
            div.classList.add("preview-item");

            const reader = new FileReader();
            reader.onload = function(e) {
                if (isImage) {
                    div.innerHTML = `<img src="${e.target.result}" width="150"><button type="button" class="remove-btn">×</button>`;
                } else {
                    div.innerHTML = `<video width="150" controls src="${e.target.result}"></video><button type="button" class="remove-btn">×</button>`;
                }
                previewGrid.appendChild(div);

                div.querySelector(".remove-btn").onclick = function() {
                    div.remove();
                    mediaFiles = mediaFiles.filter(f => f !== file);
                };
            };
            reader.readAsDataURL(file);
        });
        mediaInput.value = ""; // Reset input
    });

    // --- SUBMISSION ---
    form.addEventListener("submit", function(e) {
        const counts = getTotalCounts();

        // Logic: Total (Server + New) must be at least 1
        if (counts.images === 0 && counts.videos === 0) {
            e.preventDefault();
            alert("Upload at least one image or video");
            return;
        }

        // Manually move our 'mediaFiles' array into the actual file input
        const dataTransfer = new DataTransfer();
        mediaFiles.forEach(f => dataTransfer.items.add(f));
        mediaInput.files = dataTransfer.files;
        
        console.log("Submitting with " + mediaInput.files.length + " new files");
    });
});