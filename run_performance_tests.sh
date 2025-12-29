#!/bin/bash

echo "Running login load test..."
k6 run ./k6/load_login.js

echo "Running login spike test..."
k6 run ./k6/spike_login.js

echo "Running professional/availability/me load test..."
k6 run ./k6/load_professional_availability_me.js

echo "Running professional/availability/me spike test..."
k6 run ./k6/spike_professional_availability_me.js

echo "All tests finished!"
