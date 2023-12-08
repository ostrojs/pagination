
class UrlWindow {

	$paginator;

	constructor($paginator) {
		this.$paginator = $paginator;
	}

	static make($paginator) {
		return (new this($paginator)).get();
	}

	get() {
		const $onEachSide = this.$paginator.$onEachSide;

		if (this.$paginator.lastPage() < ($onEachSide * 2) + 8) {
			return this.getSmallSlider();
		}

		return this.getUrlSlider($onEachSide);
	}

	getSmallSlider() {
		return {
			'first': this.$paginator.getUrlRange(1, this.lastPage()),
			'slider': null,
			'last': null,
		};
	}

	getUrlSlider($onEachSide) {
		const $window = $onEachSide + 4;

		if (!this.hasPages()) {
			return { 'first': null, 'slider': null, 'last': null };
		}


		if (this.currentPage() <= $window) {
			return this.getSliderTooCloseToBeginning($window, $onEachSide);
		}

		else if (this.currentPage() > (this.lastPage() - $window)) {
			return this.getSliderTooCloseToEnding($window, $onEachSide);
		}

		return this.getFullSlider($onEachSide);
	}

	getSliderTooCloseToBeginning($window, $onEachSide) {
		return {
			'first': this.$paginator.getUrlRange(1, $window + $onEachSide),
			'slider': null,
			'last': this.getFinish(),
		};
	}

	getSliderTooCloseToEnding($window, $onEachSide) {
		const $last = this.$paginator.getUrlRange(
			this.lastPage() - ($window + ($onEachSide - 1)),
			this.lastPage()
		);

		return {
			'first': this.getStart(),
			'slider': null,
			'last': $last,
		};
	}

	getFullSlider($onEachSide) {
		return {
			'first': this.getStart(),
			'slider': this.getAdjacentUrlRange($onEachSide),
			'last': this.getFinish(),
		};
	}

	getAdjacentUrlRange($onEachSide) {
		return this.$paginator.getUrlRange(
			this.currentPage() - $onEachSide,
			this.currentPage() + $onEachSide
		);
	}

	getStart() {
		return this.$paginator.getUrlRange(1, 2);
	}


	getFinish() {
		return this.$paginator.getUrlRange(
			this.lastPage() - 1,
			this.lastPage()
		);
	}

	hasPages() {
		return this.$paginator.lastPage() > 1;
	}

	currentPage() {
		return this.$paginator.currentPage();
	}

	lastPage() {
		return this.$paginator.lastPage();
	}
}
module.exports = UrlWindow;