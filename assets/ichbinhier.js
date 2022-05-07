(function () {
	const client = "undefined" == typeof browser ? chrome : browser;
	const READ_FROM_STORAGE = "read-from-storage";
	const STORAGE_KEY = "lastCollectedUserList";
	const FORM_SELECTOR = 'form[action="/blockapi"]';
	const BLOCK_BUTTON_CLASS = "block-button";
	const BLOCK_BUTTON_SELECTOR = `.${BLOCK_BUTTON_CLASS}`;
	const USERS_PER_REQUEST = 5;
	const INTERVAL = 1000;
	const IFRAME_NAME = "output-frame";

	const icons = {
		Home: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>`,
		Login: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>`,
		Logout: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>`,
	};

	init();

	function init() {
		setUpLoginPage();
		setUpHeader();
		setUpMain();
		setUpConfirmationPage().then((form) => {
			if (!form) {
				return;
			}

			console.log(form);
			setUpBlockForm(form);
		});
	}

	function setUpBlockForm(form) {
		const blockButton = form.querySelector(BLOCK_BUTTON_SELECTOR);
		if (!blockButton) {
			return;
		}

		blockButton.addEventListener("click", (event) => {
			event.preventDefault();
			const checkboxes = form.querySelectorAll('input[type="checkbox"]');

			let counter = 1;

			const interval = setInterval(() => {
				console.log("start interval");

				if (counter > Math.round(checkboxes.length / USERS_PER_REQUEST)) {
					console.log("All accounts blocked.");
					document.querySelector("body").classList.add("all-blocked");
					clearInterval(interval);
				}

				checkboxes.forEach((checkbox, index) => {
					const isAlreadyBlocked = index < (counter - 1) * USERS_PER_REQUEST;
					const shouldBlockCurrently =
						index < counter * USERS_PER_REQUEST && index >= (counter - 1) * USERS_PER_REQUEST;
					checkbox.checked = shouldBlockCurrently;

					if (shouldBlockCurrently) {
						checkbox.parentElement.classList.add("blocking");
						console.log(`Blocking ${checkbox.value} ...`);
					}

					if (isAlreadyBlocked) {
						checkbox.parentElement.classList.add("blocked");
					}
				});

				form.submit();
				counter++;
			}, INTERVAL);
		});
	}

	async function getUsers() {
		return client.storage.local.get(STORAGE_KEY).then((value) => {
			return value[STORAGE_KEY];
		});
	}

	function shouldReadUsersFromStorage() {
		const paramString = location.href.split("?")[1];
		const queryString = new URLSearchParams(paramString);
		return queryString.get("users") === READ_FROM_STORAGE;
	}

	async function getFormCheckItems() {
		return getUsers().then((usersFromStorage) => {
			let users = [];
			const prefilledFormChecks = document.querySelectorAll(".form-check");

			if (shouldReadUsersFromStorage() && prefilledFormChecks?.length) {
				console.log("should read from storage");
				users = Array.from(prefilledFormChecks)
					.map((check) => check.querySelector('input[name="profile_urls"]').value)
					.filter((user) => user !== READ_FROM_STORAGE);
			}

			const finalUsersList =
				shouldReadUsersFromStorage() && usersFromStorage ? users.concat(usersFromStorage) : users;
			return finalUsersList.map((user) => {
				const formCheck = document.createElement("div");
				formCheck.classList.add("form-check");
				formCheck.innerHTML = `
							<input class="form-check-input" name="profile_urls" type="checkbox" value="${user}" id="check-${user}" checked="">
							<label class="form-check-label" for="check-${user}">${user}</label>`;
				return formCheck;
			});
		});
	}

	async function setUpConfirmationPage() {
		const heading = document.querySelector("form h2");
		if (heading) {
			heading.innerHTML = getLabel("ichbinhier_heading", "Block following users?");
			heading.classList.add("confirm-heading");
		}

		const blockButton = document.querySelector(".btn.btn-danger");
		if (blockButton) {
			blockButton.classList.add(BLOCK_BUTTON_CLASS);
			blockButton.value = getLabel("ichbinhier_blockButtonLabel", "Block");
			blockButton.setAttribute("onclick", "");
			// blockButton.setAttribute("type", "submit");
		}

		const form = document.querySelector(FORM_SELECTOR);

		if (!form) {
			return new Promise((resolve) => resolve());
		}

		form.target = IFRAME_NAME; // "_blank"; // IFRAME_NAME;

		return getFormCheckItems().then((formCheckItems) => {
			form.parentElement.innerHTML = `
					<div class="row">
						<div class="col-12">
							${form.outerHTML}
						</div>
					</div>`;

			const newForm = document.querySelector(FORM_SELECTOR);
			if (newForm) {
				newForm.append(...formCheckItems);
			}

			// Remove read-from-storage entry:
			const readFromStorageEntry = document.querySelector(
				`.form-check input[value="${READ_FROM_STORAGE}"]`
			);
			if (readFromStorageEntry) {
				readFromStorageEntry.parentElement.remove();
			}

			// Put block button on the top:
			const formHeadingWrapper = document.createElement("div");
			formHeadingWrapper.classList.add("form-heading-wrapper");
			const newBlockButton = newForm.querySelector(BLOCK_BUTTON_SELECTOR);
			const newHeading = document.querySelector(".confirm-heading");
			formHeadingWrapper.append(newHeading.cloneNode(true), newBlockButton.cloneNode(true));
			newBlockButton.remove();
			newHeading.remove();
			newForm.prepend(formHeadingWrapper);
			return newForm;
		});
	}

	function setUpHeader() {
		const nav = Array.from(document.querySelectorAll("body > .container > .row > .col-md-8 > a"));
		const originalContainer = document.querySelector(".container");
		const header = document.createElement("header");

		header.innerHTML = `
      <nav class="navbar navbar-expand-lg navbar-light">
        <div class="container">
          <ul class="navbar-nav mr-auto col-12">
          	${nav
							.map(
								(item) =>
									`<li class="nav-item">
										<a class="nav-link" href="${item.href}">
											${getIcon(item.innerHTML)}
											<span>${item.innerHTML}</span>
										</a>
									</li>`
							)
							.join("")}
          </ul>
        </div>
      </nav>`;

		document.body.removeChild(originalContainer);
		document.body.prepend(header);
	}

	function setUpLoginPage() {
		const isLoginPage =
			document.querySelectorAll("body > .container > .row > .col-md-8 > a").length === 2;

		if (!isLoginPage) {
			return;
		}

		document.querySelectorAll("p").forEach((p) => {
			p.parentNode.removeChild(p);
		});

		const newP1 = document.createElement("p");
		const newP2 = document.createElement("p");
		newP1.innerHTML = `
			${getLabel("ichbinhier_privacyInfo", "We do not store any data except the usual server log files.")}
			${getLabel("ichbinhier_pivacyInfoHeroku", "Here you can find")}
			<a href="https://www.salesforce.com/company/privacy/" target="_blank">${getLabel(
				"ichbinhier_pivacyInfoHerokuLinkLabel",
				"privacy information to our hosting service Heroku"
			)}</a>.`;
		newP2.innerHTML = `
			${getLabel("ichbinhier_repoInfo", "You can find the source code of this web application on")}
			<a href="https://github.com/pkreissel/ichbinhier_twittertools" target="_blank">Github</a>.`;

		const container = document.querySelector("body > .container:nth-child(2)");
		container.append(newP1, newP2);
	}

	function getIcon(label) {
		return Object.keys(icons).includes(label) ? icons[label] : "";
	}

	function setUpMain() {
		const main = document.createElement("main");
		const originalContainer = document.querySelector(".container:nth-child(2)");
		main.innerHTML = `
			<div class="container">${originalContainer.innerHTML}</div>
			<div class="container">
				<p class="confirm-message">
					<svg class="w-6 h-6" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
					${getLabel("ichbinhier_blockSuccess", "All blocked")}
				</p>
			</div>
			<div class="container">
				<iframe src="" name="${IFRAME_NAME}" width="200" height="100"></iframe>
			</div>
		`;

		const output = document.getElementById("output");
		if (output) {
			main.append(output);
		}

		document.body.removeChild(originalContainer);
		document.body.append(main);
	}

	function getLabel(key, fallback) {
		if (!client) {
			return fallback;
		}

		const label = client.i18n.getMessage(key);

		if (!label) {
			return fallback;
		}

		return label;
	}
})();
