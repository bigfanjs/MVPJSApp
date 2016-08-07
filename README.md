# Manually implementing MVP design pattern in JavaScript.

In this repository I've built a web application on top of an application-level structure using the MVP design pattern.

Here is the communication flow I used in my application:
![Alt text](/client/images/mvp.png?raw=true "MVP")

## Advantages:
- your code would be more modulare.
- it's less painfull to debug.
- it's more testable(very easy to mock the view).
- the view is much more decoupled than the presenter.

## Usage

const
	model = Model.setup({
		author: 'Adel',
		title: 'Adel\'s blog',
		url: 'http://adelsblogs.com'
	}),
	presenter = Presenter.setup({ model });

### Testing The View.

const
	mock = {
		set() { return ''; },
		get() { return ''; }
	},
	presenter = Presenter.setup({
		view: mock
	});