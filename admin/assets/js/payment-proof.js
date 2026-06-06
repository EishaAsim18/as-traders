function readImageFileAsDataUrl(file) {
  return new Promise(function (resolve, reject) {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Choose a JPG, PNG, or WebP image"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error("Image must be 5 MB or smaller"));
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      resolve(reader.result);
    };
    reader.onerror = function () {
      reject(new Error("Could not read file"));
    };
    reader.readAsDataURL(file);
  });
}

function proofImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const origin =
    typeof API_BASE_URL !== "undefined"
      ? API_BASE_URL
      : typeof getBackendOrigin === "function"
        ? getBackendOrigin()
        : "https://as-traders-production.up.railway.app";
  return origin + path;
}
