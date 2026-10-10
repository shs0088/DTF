# Batch 337: alpha and mockup-safe edge processing

Chinese case-study measurements show that a so-called fringe cleanup may modify alpha, erase pale foreground and leave hard edges. Separate alpha refinement from RGB decontamination, record per-channel differences and protect light details. Recovering foreground RGB by dividing by alpha is ill-conditioned near zero.

A Unity tutorial fills RGB of fully transparent pixels using nearby visible colors but only for immediate neighbors. A C++ alpha-bleeding implementation iterates across wider transparent padding. Keep this texture-RGB operation in a mockup derivative, not the printable master.

Japanese resampling and compositing studies highlight subpixel center alignment, border extrapolation, and straight/premultiplied alpha conventions. Test composites against dark, white and colored backgrounds.
