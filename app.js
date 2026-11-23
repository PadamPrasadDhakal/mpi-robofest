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

// Project Exhibition Registration
const projectForm = document.getElementById("projectForm");
const projectMessage = document.getElementById("projectFormMessage");
const projectSubmitButton = document.getElementById("projectSubmitButton");

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  projectMessage.className = "form-message";
  projectMessage.textContent = "";

  const data = new FormData(projectForm);
  const payload = {
    contact_person: data.get("proj_contact_person").trim(),
    contact_phone: data.get("proj_contact_phone").trim(),
    contact_email: data.get("proj_contact_email").trim().toLowerCase(),
    institution: data.get("proj_institution").trim(),
    project_title: data.get("proj_title").trim(),
    project_description: data.get("proj_description").trim(),
    member1_name: data.get("member1_name").trim(),
    member1_class: data.get("member1_class").trim(),
    member2_name: data.get("member2_name").trim(),
    member2_class: data.get("member2_class").trim(),
    member3_name: data.get("member3_name").trim(),
    member3_class: data.get("member3_class").trim(),
    member4_name: data.get("member4_name").trim(),
    member4_class: data.get("member4_class").trim(),
  };

  const required = ["contact_person","contact_phone","contact_email","institution","project_title","project_description","member1_name","member1_class","member2_name","member2_class","member3_name","member3_class"];
  if (required.some(k => !payload[k])) {
    projectMessage.classList.add("error");
    projectMessage.textContent = "Please complete all required fields.";
    return;
  }

  projectSubmitButton.disabled = true;
  projectSubmitButton.textContent = "Submitting registration…";

  try {
    const response = await fetch("/api/project-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Registration could not be completed.");

    projectForm.reset();
    projectMessage.classList.add("success");
    projectMessage.textContent = result.emailSent
      ? "Registration successful! A confirmation email has been sent."
      : "Registration successful! Your details are saved. Email confirmation could not be sent automatically.";
  } catch (error) {
    console.error(error);
    projectMessage.classList.add("error");
    projectMessage.textContent = error.message || "We could not submit your registration. Please try again.";
  } finally {
    projectSubmitButton.disabled = false;
    projectSubmitButton.innerHTML = 'Submit project registration <span>↗</span>';
  }
});
