
# -----------------------------------------------------------------------
# Script to generate automatically a json with the names of images and
# calibration information.
# -----------------------------------------------------------------------

# Libraries -------------------------------------------------------------
import os
import json
# -----------------------------------------------------------------------

# Variables -------------------------------------------------------------
directory = 'chambord/'
output_file = 'index.json'

orientation_directory = 'ori/'
image_directory = 'img/'
# -----------------------------------------------------------------------

# Source code -----------------------------------------------------------

images = []
orientations = []
# r=root, d=directories, f = files
for r, d, f in os.walk(directory+image_directory):
    for file in f:
        if '.JPG' in file:
            images.append(image_directory+file)
            orientations.append(orientation_directory+'Orientation-'+file+'.xml')

data = {
    'ori': orientations,
    'img': images
}

with open(directory+output_file, "w") as write_file:
    json.dump(data, write_file)
