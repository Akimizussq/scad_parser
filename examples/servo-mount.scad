/*
 * Servo Mount + Arduino Base
 * Simple 3D printable mount for SG90 servo and Arduino Uno
 * 
 * Dimensions:
 *   SG90 Servo: 23x12.5x29 mm (body)
 *   Arduino Uno: 68.6x53.4 mm
 * 
 * This design includes:
 *   1. Servo mounting bracket with screw holes
 *   2. Arduino Uno base plate
 *   3. Cable management holes
 */

// ========== CONFIGURATION ==========
$fn = 50; // Resolution

// Servo dimensions (SG90)
servo_width = 23;
servo_length = 12.5;
servo_height = 29;
servo_hole_dia = 2.2; // M2 screw holes
servo_hole_spacing = 10; // Distance between mounting holes

// Arduino Uno dimensions
arduino_width = 68.6;
arduino_length = 53.4;
arduino_height = 15; // Including components
arduino_hole_dia = 3.2; // M3 screw holes
arduino_hole_positions = [
    [3.5, 2.5],        // Top-left
    [66.1, 2.5],       // Top-right
    [3.5, 50.9],       // Bottom-left
    [66.1, 50.9]       // Bottom-right
];

// Base plate
base_thickness = 3;
base_margin = 10; // Extra space around components
wall_thickness = 2;

// ========== SERVO MOUNT ==========
module servo_mount() {
    // Servo mounting bracket
    bracket_width = servo_width + wall_thickness * 2;
    bracket_length = servo_length + wall_thickness * 2;
    bracket_height = servo_height / 2; // Only half height for mounting
    
    difference() {
        // Main bracket
        cube([bracket_width, bracket_length, bracket_height]);
        
        // Servo cavity
        translate([wall_thickness, wall_thickness, -1])
        cube([servo_width, servo_length, bracket_height + 2]);
        
        // Screw holes for servo mounting
        translate([bracket_width/2 - servo_hole_spacing/2, bracket_length/2, -1])
        cylinder(d=servo_hole_dia, h=bracket_height + 2);
        
        translate([bracket_width/2 + servo_hole_spacing/2, bracket_length/2, -1])
        cylinder(d=servo_hole_dia, h=bracket_height + 2);
        
        // Cable exit hole
        translate([bracket_width/2, bracket_length - 5, bracket_height/2])
        rotate([90, 0, 0])
        cylinder(d=8, h=wall_thickness + 2);
    }
    
    // Support arm (connects to base)
    support_width = 15;
    support_length = 30;
    support_height = bracket_height;
    
    translate([(bracket_width - support_width)/2, bracket_length, 0])
    cube([support_width, support_length, support_height]);
}

// ========== ARDUINO BASE ==========
module arduino_base() {
    base_width = arduino_width + base_margin * 2;
    base_length = arduino_length + base_margin * 2;
    
    difference() {
        // Main base plate
        cube([base_width, base_length, base_thickness]);
        
        // Arduino mounting holes
        for(pos = arduino_hole_positions) {
            translate([pos[0] + base_margin/2, pos[1] + base_margin/2, -1])
            cylinder(d=arduino_hole_dia, h=base_thickness + 2);
        }
        
        // Cable routing holes
        translate([base_width/2, base_length - 15, -1])
        cylinder(d=10, h=base_thickness + 2);
        
        translate([base_width/2, 15, -1])
        cylinder(d=10, h=base_thickness + 2);
    }
    
    // Standoffs for Arduino
    standoff_height = 8;
    standoff_dia = 6;
    
    for(pos = arduino_hole_positions) {
        translate([pos[0] + base_margin/2, pos[1] + base_margin/2, base_thickness])
        difference() {
            cylinder(d=standoff_dia, h=standoff_height);
            translate([0, 0, -1])
            cylinder(d=arduino_hole_dia, h=standoff_height + 2);
        }
    }
}

// ========== MAIN ASSEMBLY ==========
// Position servo mount on the base
servo_mount_x = 25;
servo_mount_y = 20;

// Base plate
translate([0, 0, 0])
arduino_base();

// Servo mount (attached to base)
translate([servo_mount_x, servo_mount_y, base_thickness])
servo_mount();

// ========== VISUALIZATION AIDS ==========
// Arduino outline (transparent, for reference)
%translate([base_margin/2, base_margin/2, base_thickness + 8])
color("blue", 0.2)
cube([arduino_width, arduino_length, 2]);

// Servo outline (transparent, for reference)
%translate([servo_mount_x + wall_thickness, servo_mount_y + wall_thickness, base_thickness + 8])
color("red", 0.2)
cube([servo_width, servo_length, servo_height]);

// ========== ANNOTATIONS ==========
// Dimensions annotation (optional - uncomment to see)
/*
translate([0, 0, base_thickness + 30])
color("black")
text("Servo Mount + Arduino Base", size=5);
*/

echo("=== Design Summary ===");
echo("Base plate size:", arduino_width + base_margin * 2, "x", arduino_length + base_margin * 2, "mm");
echo("Servo mount position:", servo_mount_x, ",", servo_mount_y, "mm from base corner");
echo("Total height:", base_thickness + servo_height/2, "mm");
echo("=====================");