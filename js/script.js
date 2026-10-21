
const menuToggle = document.querySelector("#menuToggle");
const navLinks = document.querySelector("#navLinks");

// Open or close the mobile navigation
menuToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");

  menuToggle.setAttribute("aria-expanded", isOpen);
  menuToggle.setAttribute(
    "aria-label",
    isOpen ? "Close navigation" : "Open navigation"
  );

  menuToggle.textContent = isOpen ? "✕" : "☰";
});

// Close the menu when a navigation link is clicked
navLinks.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    menuToggle.textContent = "☰";
  });
});

// Close the menu with the Escape key
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    menuToggle.textContent = "☰";
  }
});

/* ===== Events page category filters ===== */

const filterButtons = document.querySelectorAll(".filter-button");
const eventCards = document.querySelectorAll("#eventGrid .event-card");
const eventCount = document.querySelector("#eventCount");
const noEvents = document.querySelector("#noEvents");

filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    const selectedCategory = button.dataset.filter;
    let visibleCount = 0;

    filterButtons.forEach(item => {
      const isActive = item === button;

      item.classList.toggle("active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    eventCards.forEach(card => {
      const matches =
        selectedCategory === "all" ||
        card.dataset.category === selectedCategory;

      card.hidden = !matches;

      if (matches) {
        visibleCount++;
      }
    });

    eventCount.textContent =
      `Showing ${visibleCount} event${visibleCount === 1 ? "" : "s"}`;

    noEvents.hidden = visibleCount !== 0;
  });
});

/* ===== Registration form validation ===== */

const registrationForm = document.querySelector("#registrationForm");

if (registrationForm) {
  const formMessage = document.querySelector("#formMessage");
  const eventCheckboxes = registrationForm.querySelectorAll(
    'input[name="events"]'
  );

  registrationForm.addEventListener("submit", event => {
    event.preventDefault();

    formMessage.hidden = true;
    formMessage.className = "form-message";

    // Use the browser's built-in validation first.
    if (!registrationForm.reportValidity()) {
      return;
    }

    const selectedEvents = [...eventCheckboxes].filter(
      checkbox => checkbox.checked
    );

    if (selectedEvents.length === 0) {
      formMessage.textContent = "Please select at least one event.";
      formMessage.classList.add("error");
      formMessage.hidden = false;
      return;
    }

    const formData = new FormData(registrationForm);
    const name = formData.get("fullName").trim();

    formMessage.textContent =
      `Thank you, ${name}! Your demo registration is valid. ` +
      "No information has been sent to a server.";

    formMessage.classList.add("success");
    formMessage.hidden = false;
  });
}
