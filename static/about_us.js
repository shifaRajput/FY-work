 const photo = document.getElementById('main-photo');
        const trigger = document.getElementById('story-trigger');

        // 1. Swapping Animation Observer
        const swapObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    photo.classList.add('move-effect');
                } else if (entry.boundingClientRect.top > 0) {
                    photo.classList.remove('move-effect');
                }
            });
        }, { threshold: 0.4 });

        swapObserver.observe(trigger);

        // 2. Reveal on Scroll Logic
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

        // 3. Counter Animation Logic
        let counted = false;
        const statsSection = document.getElementById('stats-section');

        function count(id, target) {
            let num = 0;
            let speed = target / 70;
            let interval = setInterval(() => {
                num += speed;
                if (num >= target) {
                    num = target;
                    clearInterval(interval);
                }
                document.getElementById(id).innerHTML = Math.floor(num) + "+";
            }, 30);
        }

        const statsObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !counted) {
                count("year", 17);
                count("customer", 50000);
                count("device", 100000);
                counted = true;
            }
        }, { threshold: 0.5 });

        statsObserver.observe(statsSection);
        
        // Back link
        document.querySelector(".back-btn").addEventListener("click", () => {
          window.history.back();
        });