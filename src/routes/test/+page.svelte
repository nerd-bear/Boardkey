<div class="h-50 w-50 bg-red-500"></div>

<style>
	div {
		transform: scale(0.75) rotateY(-30deg) rotateX(45deg) translateZ(4.5rem);
		transform-origin: 50% 100%;
		transform-style: preserve-3d;
		box-shadow: 1rem 1rem 2rem rgba(0, 0, 0, 0.25);
		transition: 0.6s ease transform;

		&:hover {
			transform: scale(1);
		}

		&::before {
			transform: translateZ(4rem);
			&:hover {
				transform: translateZ(0);
			}
		}

		&::after {
			transform: translateZ(-4rem);
			&:hover {
				transform: translateZ(-1px);
			}
		}
	}
</style>
