# OptimizerLab

An interactive visual encyclopedia of optimization algorithms: inspect 2D contours and 3D loss landscapes, place an optimizer on a surface, and compare trajectories.

## Run locally

Open `index.html` in a modern browser (or run `python -m http.server 8000`). This project uses native browser modules and Canvas, with no runtime dependencies.

## Deployment

The included GitHub Actions workflow deploys this static site to GitHub Pages. In repository **Settings → Pages**, choose **GitHub Actions** as the build source if needed.

## Accuracy

Algorithms compute actual parameter updates in `src/optimizers.js`. Frames in animations are interpolations between those updates and should not be mistaken for extra optimization steps. Optimizers requiring matrix-valued parameters are not simulated on 2D parameter landscapes.
