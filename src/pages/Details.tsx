import { Phone, Mail, MapPin, Clock, Instagram, Facebook } from 'lucide-react';
import { motion } from 'framer-motion';
import streetEatzLogo from '@/assets/street-eatz-logo.png';

const hours = [
  { day: 'Thursday', time: '12pm - 7pm' },
  { day: 'Friday', time: '12pm - 7pm' },
  { day: 'Saturday', time: '1pm - 7pm' },
  { day: 'Sunday', time: '1pm - 7pm' },
];

export default function Details() {
  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header with Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <img 
            src={streetEatzLogo} 
            alt="Street Eatz Logo" 
            className="w-32 h-32 mx-auto mb-4 object-contain"
          />
          <h1 className="font-heading text-3xl font-bold text-foreground tracking-wider">
            STREET <span className="text-primary">EATZ</span>
          </h1>
          <p className="text-muted-foreground mt-2">Gourmet Street Food • Waterford</p>
        </motion.div>

        {/* Opening Hours */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-heading text-lg font-semibold text-foreground">Opening Hours</h2>
          </div>
          <div className="space-y-3">
            {hours.map(({ day, time }) => (
              <div key={day} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                <span className="text-foreground font-medium">{day}</span>
                <span className="text-primary font-semibold">{time}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Contact Info */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 mb-6"
        >
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Contact Us</h2>
          <div className="space-y-4">
            <a 
              href="tel:0863619157" 
              className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="text-foreground font-medium">086 361 9157</p>
              </div>
            </a>
            <a 
              href="mailto:streeteatzwaterford@gmail.com" 
              className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-foreground font-medium text-sm">streeteatzwaterford@gmail.com</p>
              </div>
            </a>
          </div>
        </motion.section>

        {/* Social Media */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 mb-6"
        >
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Follow Us</h2>
          <div className="flex gap-4">
            <a 
              href="https://www.instagram.com/streeteatzwaterford" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-3 p-4 rounded-lg bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 transition-colors border border-purple-500/20"
            >
              <Instagram className="w-6 h-6 text-pink-400" />
              <span className="text-foreground font-medium">Instagram</span>
            </a>
            <a 
              href="https://www.facebook.com/223559870839289" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-3 p-4 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 transition-colors border border-blue-500/20"
            >
              <Facebook className="w-6 h-6 text-blue-400" />
              <span className="text-foreground font-medium">Facebook</span>
            </a>
          </div>
        </motion.section>

        {/* Location */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-heading text-lg font-semibold text-foreground">Location</h2>
          </div>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            Crystal Sports and Leisure Centre,<br />
            Cork Rd, Ballynaneashagh,<br />
            Waterford, X91 E6PX
          </p>
          <div className="rounded-xl overflow-hidden border border-border">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2456.8976!2d-7.1347!3d52.2397!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4842c3c4f5f5f5f5%3A0x5f5f5f5f5f5f5f5f!2sCrystal%20Sports%20and%20Leisure%20Centre!5e0!3m2!1sen!2sie!4v1699999999999!5m2!1sen!2sie"
              width="100%"
              height="250"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Street Eatz Location"
              className="grayscale hover:grayscale-0 transition-all duration-500"
            />
          </div>
        </motion.section>
      </div>
    </div>
  );
}
