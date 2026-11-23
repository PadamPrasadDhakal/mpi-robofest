const cfg = window.APP_CONFIG || {};
const form = document.getElementById("registrationForm");
const message = document.getElementById("formMessage");
const submitButton = document.getElementById("submitButton");

document.getElementById("menuToggle").addEventListener("click", () => {
  document.getElementById("mainNav").classList.toggle("open");
});
document.querySelectorAll("#mainNav a").forEach(link => link.addEventListener("click", () => {
  document.getElementById("mainNav").classList.remove("open");
}));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.className = "form-message";
  message.textContent = "";

  const data = new FormData(form);
  const payload = {
    school_name: data.get("school_name").trim(),
    school_address: data.get("school_address").trim(),
    contact_person: data.get("contact_person").trim(),
    contact_phone: data.get("contact_phone").trim(),
    contact_email: data.get("contact_email").trim().toLowerCase(),
    male_student_name: data.get("male_name").trim(),
    male_student_class: data.get("male_class").trim(),
    male_student_address: data.get("male_address").trim(),
    female_student_name: data.get("female_name").trim(),
    female_student_class: data.get("female_class").trim(),
    female_student_address: data.get("female_address").trim()
  };

  if (Object.values(payload).some(value => !value)) {
    message.classList.add("error");
    message.textContent = "Please complete all required fields.";
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Submitting registration…";

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Registration could not be completed.");

    form.reset();
    message.classList.add("success");
    message.textContent = result.emailSent
      ? "Registration successful! A confirmation email has been sent to the school's contact email."
      : "Registration successful! Your details are saved. Email confirmation could not be sent automatically; please contact the organizer if needed.";
  } catch (error) {
    console.error(error);
    message.classList.add("error");
    message.textContent = error.message || "We could not submit your registration. Please try again.";
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Submit registration <span>↗</span>';
  }
});